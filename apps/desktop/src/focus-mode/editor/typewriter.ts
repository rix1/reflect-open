import { getIsComposing } from '@meowdown/core'
import {
  definePlugin,
  isTextSelection,
  Priority,
  withPriority,
  type PlainExtension,
} from '@prosekit/core'
import { Plugin, PluginKey, type EditorState, type PluginView } from '@prosekit/pm/state'
import type { EditorView } from '@prosekit/pm/view'
import { smoothScrollBy } from './smooth-scroll.ts'

/**
 * Focus mode's typewriter scrolling: the caret line stays at the vertical
 * center of the nearest scrollable ancestor. A ProseKit extension the note
 * editor mounts through `useExtension` while focus mode is on. It recenters
 * after every selection or document change made while the editor has focus
 * (typing, keyboard navigation, commands) and takes over the editor's
 * scroll-into-view. Clicks and IME composition never scroll: the clicked line
 * is visible already, and the page must not jump under the pointer.
 *
 * The host pads the content so the first and last lines can reach the center
 * (`data-focus-typewriter` in `index.css`).
 */

// Whether the latest selection or document change came from the pointer
// (ProseMirror tags its mouse selections with the `pointer` meta). Appended
// transactions inherit the verdict of the transaction they follow.
const key = new PluginKey<boolean>('reflect-typewriter')

// The state each view last centered for, so the scroll-into-view request of
// the same update does not measure again.
const centeredStates = new WeakMap<EditorView, EditorState>()

// After `compositionend` WebKit commits the composed text a little later, and
// `getIsComposing` keeps reporting true for its tail; center once after that.
const COMPOSITION_SETTLE_MS = 60

const SCROLLABLE_OVERFLOW = /^(?:auto|scroll|overlay)$/

interface VerticalRange {
  top: number
  bottom: number
}

interface CaretLine {
  top: number
  height: number
}

function isFromPointer(state: EditorState): boolean {
  return key.getState(state) === true
}

/**
 * The caret line's box. The editor hides Markdown syntax at zero size, so a
 * caret beside hidden syntax can measure flat on one side: try both sides,
 * then the native selection.
 */
function measureCaretLine(view: EditorView): CaretLine | undefined {
  const { head } = view.state.selection
  for (const side of [1, -1]) {
    try {
      const coords = view.coordsAtPos(head, side)
      if (coords.bottom > coords.top) {
        return { top: coords.top, height: coords.bottom - coords.top }
      }
    } catch {
      // A position without DOM yet (mid-render); fall through.
    }
  }
  const selection = view.dom.ownerDocument.getSelection()
  if (selection === null || selection.rangeCount === 0) {
    return undefined
  }
  const range = selection.getRangeAt(0).cloneRange()
  range.collapse(true)
  const rect = [...range.getClientRects()].findLast((candidate) => candidate.height > 0)
  return rect === undefined ? undefined : { top: rect.top, height: rect.height }
}

/**
 * The nearest ancestor of the editor that scrolls vertically and has
 * something to scroll, or `'window'` when there is none below `<body>`.
 */
function findScroller(view: EditorView): HTMLElement | 'window' {
  const doc = view.dom.ownerDocument
  for (let element: HTMLElement | null = view.dom; element; element = element.parentElement) {
    if (element === doc.body || element === doc.documentElement) {
      return 'window'
    }
    const style = getComputedStyle(element)
    if (SCROLLABLE_OVERFLOW.test(style.overflowY) && element.scrollHeight > element.clientHeight) {
      return element
    }
  }
  return 'window'
}

function getVisibleRange(scroller: HTMLElement | 'window', doc: Document): VerticalRange {
  if (scroller === 'window') {
    return { top: 0, bottom: doc.documentElement.clientHeight }
  }
  const rect = scroller.getBoundingClientRect()
  const top = rect.top + scroller.clientTop
  return { top, bottom: top + scroller.clientHeight }
}

/**
 * Scroll so the caret line sits at the vertical center of the scroller's
 * visible area, easing there (`smooth-scroll.ts` retargets a running
 * animation, so it never trails behind fast typing). False when the caret
 * has no measurable geometry.
 */
function centerCaret(view: EditorView): boolean {
  if (!isTextSelection(view.state.selection)) {
    return false
  }
  const caret = measureCaretLine(view)
  if (caret === undefined) {
    return false
  }
  const doc = view.dom.ownerDocument
  const scroller = findScroller(view)
  const visible = getVisibleRange(scroller, doc)
  const delta = caret.top + caret.height / 2 - (visible.top + visible.bottom) / 2
  const element = scroller === 'window' ? doc.scrollingElement : scroller
  if (element !== null && Math.abs(delta) >= 1) {
    smoothScrollBy(element, delta)
  }
  return true
}

class TypewriterView implements PluginView {
  readonly #view: EditorView
  #compositionTimer: ReturnType<typeof setTimeout> | undefined

  constructor(view: EditorView) {
    this.#view = view
    view.dom.addEventListener('compositionend', this.#handleCompositionEnd)
  }

  update(view: EditorView, prevState: EditorState): void {
    const { state } = view
    if (state.doc === prevState.doc && state.selection.eq(prevState.selection)) {
      return
    }
    this.#center()
  }

  destroy(): void {
    clearTimeout(this.#compositionTimer)
    this.#view.dom.removeEventListener('compositionend', this.#handleCompositionEnd)
  }

  #center(): void {
    const view = this.#view
    if (view.isDestroyed || !view.hasFocus()) {
      return
    }
    if (view.composing || getIsComposing() || isFromPointer(view.state)) {
      return
    }
    if (centerCaret(view)) {
      centeredStates.set(view, view.state)
    }
  }

  readonly #handleCompositionEnd = (): void => {
    clearTimeout(this.#compositionTimer)
    this.#compositionTimer = setTimeout(() => {
      this.#center()
    }, COMPOSITION_SETTLE_MS)
  }
}

function createTypewriterPlugin(): Plugin<boolean> {
  return new Plugin<boolean>({
    key,
    state: {
      init: () => false,
      apply: (tr, fromPointer) => {
        if (tr.getMeta('appendedTransaction') !== undefined) {
          return fromPointer
        }
        if (!tr.selectionSet && !tr.docChanged) {
          return fromPointer
        }
        return tr.getMeta('pointer') === true
      },
    },
    view: (view) => new TypewriterView(view),
    props: {
      // Replaces the editor's own scroll-into-view (meowdown's included), so
      // the two never pull the caret to different places. A pointer-driven
      // selection falls through to the default.
      handleScrollToSelection: (view) => {
        if (isFromPointer(view.state)) {
          return false
        }
        if (centeredStates.get(view) === view.state) {
          return true
        }
        // Mid-composition the IME owns the caret; center after it commits.
        if (view.composing) {
          return true
        }
        if (!centerCaret(view)) {
          return false
        }
        centeredStates.set(view, view.state)
        return true
      },
    },
  })
}

/** Keep the caret line vertically centered in the editor it is mounted in. */
export function defineTypewriter(): PlainExtension {
  return withPriority(definePlugin(createTypewriterPlugin()), Priority.high)
}
