import { getIsComposing } from '@meowdown/core'
import { definePlugin, type PlainExtension } from '@prosekit/core'
import type { Mark, ProseMirrorNode } from '@prosekit/pm/model'
import { Plugin, PluginKey, type EditorState } from '@prosekit/pm/state'
import { Decoration, DecorationSet } from '@prosekit/pm/view'
import type { FocusModeDim } from '@reflect/core'
import {
  findLineAt,
  findSentenceAt,
  getSentenceBoundaries,
  SENTENCE_ATOM_PLACEHOLDER,
  SENTENCE_SYNTAX_PLACEHOLDER,
  type TextRange,
} from './sentence.ts'

/**
 * Focus mode's dimming, as in iA Writer: everything but the sentence (or the
 * textblock) holding the caret fades. A ProseKit extension the note editor
 * mounts through `useExtension` while focus mode is on; decorations only, so
 * the document and its Markdown never change.
 *
 * It sets `data-focus-dim` on the editable root and decorates only the
 * current textblock: `reflect-focus-current` on the block, and in sentence
 * mode `reflect-focus-sentence` over the current sentence plus
 * `reflect-focus-dim` over the rest of the block. `index.css` paints dimmed
 * text with `--focus-dim-color`.
 */

/** Which part of the note stays at full strength. */
export type FocusDimMode = Exclude<FocusModeDim, 'off'>

const FOCUS_CURRENT_CLASS = 'reflect-focus-current'
const FOCUS_SENTENCE_CLASS = 'reflect-focus-sentence'
const FOCUS_DIM_CLASS = 'reflect-focus-dim'

// meowdown's mark names (its `mark-names.ts`, not exported). Syntax marks
// cover Markdown punctuation the editor hides; atom marks cover a whole unit
// (a wikilink, an image) rendered as one preview.
const SYNTAX_MARK_NAMES: ReadonlySet<string> = new Set(['mdMark', 'mdLinkUri', 'mdLinkTitle'])
const ATOM_MARK_NAMES: ReadonlySet<string> = new Set(['mdWikilink', 'mdImage', 'mdFile', 'mdMath'])

interface SegmentedText {
  text: string
  boundaries: number[]
}

const key = new PluginKey<DecorationSet>('reflect-focus-dim')

// Textblocks are immutable and keep their identity across selection-only
// transactions, so moving the caret inside one block segments it only once.
const segmentCache = new WeakMap<ProseMirrorNode, SegmentedText>()

function hasMarkIn(marks: readonly Mark[], names: ReadonlySet<string>): boolean {
  return marks.some((mark) => names.has(mark.type.name))
}

/**
 * Project a textblock's content to a string whose UTF-16 offsets equal the
 * block's content offsets. Syntax characters become transparent placeholders
 * and atom units word-like ones (see `SENTENCE_*_PLACEHOLDER`), so hidden
 * Markdown neither splits nor merges sentences.
 */
function getSentenceText(textblock: ProseMirrorNode): string {
  let text = ''
  textblock.forEach((child) => {
    if (!child.isText) {
      text += SENTENCE_ATOM_PLACEHOLDER.repeat(child.nodeSize)
      return
    }
    const value = child.text ?? ''
    if (hasMarkIn(child.marks, ATOM_MARK_NAMES)) {
      text += SENTENCE_ATOM_PLACEHOLDER.repeat(value.length)
    } else if (hasMarkIn(child.marks, SYNTAX_MARK_NAMES)) {
      text += SENTENCE_SYNTAX_PLACEHOLDER.repeat(value.length)
    } else {
      text += value
    }
  })
  return text
}

function getSegmentedText(textblock: ProseMirrorNode): SegmentedText {
  let segmented = segmentCache.get(textblock)
  if (segmented === undefined) {
    const code = textblock.type.spec.code === true
    const text = code ? textblock.textContent : getSentenceText(textblock)
    segmented = { text, boundaries: code ? [] : getSentenceBoundaries(text) }
    segmentCache.set(textblock, segmented)
  }
  return segmented
}

/**
 * The current sentence of `textblock` for a caret at content offset `offset`
 * (the current line in a code block). Empty when the caret starts a new
 * sentence after trailing whitespace; undefined for an empty block.
 */
function findFocusSentence(textblock: ProseMirrorNode, offset: number): TextRange | undefined {
  if (textblock.content.size === 0) {
    return undefined
  }
  const { text, boundaries } = getSegmentedText(textblock)
  if (textblock.type.spec.code === true) {
    return findLineAt(text, offset)
  }
  return findSentenceAt(text, boundaries, offset)
}

function computeDecorations(
  { doc, selection }: Pick<EditorState, 'doc' | 'selection'>,
  mode: FocusDimMode,
): DecorationSet {
  const { $head } = selection
  const block = $head.parent
  if ($head.depth === 0 || !block.isTextblock) {
    return DecorationSet.empty
  }

  const decorations = [
    Decoration.node($head.before(), $head.after(), { class: FOCUS_CURRENT_CLASS }),
  ]

  if (mode === 'sentence') {
    const start = $head.start()
    const end = $head.end()
    const range = findFocusSentence(block, $head.parentOffset)
    if (range !== undefined) {
      const from = start + range.from
      const to = start + range.to
      if (to > from) {
        decorations.push(
          Decoration.inline(from, to, { class: FOCUS_SENTENCE_CLASS }, { inclusiveEnd: true }),
        )
      }
      if (from > start) {
        decorations.push(Decoration.inline(start, from, { class: FOCUS_DIM_CLASS }))
      }
      if (end > to) {
        decorations.push(Decoration.inline(to, end, { class: FOCUS_DIM_CLASS }))
      }
    }
  }

  return DecorationSet.create(doc, decorations)
}

// A decoration bug must never take the editor down: drop the dimming instead.
function safeComputeDecorations(
  state: Pick<EditorState, 'doc' | 'selection'>,
  mode: FocusDimMode,
): DecorationSet {
  try {
    return computeDecorations(state, mode)
  } catch (error) {
    reportError(error)
    return DecorationSet.empty
  }
}

function createFocusDimPlugin(mode: FocusDimMode): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key,
    state: {
      init: (_config, state) => safeComputeDecorations(state, mode),
      apply: (tr, decorations) => {
        if (!tr.docChanged && !tr.selectionSet) {
          return decorations
        }
        // Recomputing mid-composition would re-render the text the IME is
        // composing into; keep the previous ranges until it commits.
        if (tr.getMeta('composition') !== undefined || getIsComposing()) {
          return decorations.map(tr.mapping, tr.doc)
        }
        return safeComputeDecorations(tr, mode)
      },
    },
    props: {
      attributes: { 'data-focus-dim': mode },
      decorations: (state) => key.getState(state) ?? null,
    },
  })
}

/**
 * Dim everything but the current sentence or textblock of the editor it is
 * mounted in. The decorations follow the selection whether or not the editor
 * has focus; style `.ProseMirror-focused` to treat unfocused editors
 * differently.
 */
export function defineFocusDim(mode: FocusDimMode): PlainExtension {
  return definePlugin(createFocusDimPlugin(mode))
}
