import type { NoteEditorHandle } from '@/editor/note-editor.tsx'

// About half a second at 60Hz: long enough for a virtualized row to be
// measured and shown, short enough that a focus that never lands gives up
// before the user notices it arrive late.
const MAX_FRAMES = 30

/**
 * Focus a freshly mounted editor, with the caret at `selection`, once it can
 * take focus. A virtualized row (the daily stream's virtua list) stays
 * `visibility: hidden` until it is measured, and the browser silently ignores
 * `focus()` on a hidden element, so while `container()` is hidden the attempt
 * repeats once per frame. An attempt on a visible container is the last one:
 * a shown editor that refuses focus will not take it on a retry. It also
 * stops when the user moves focus somewhere else in the meantime.
 *
 * `onDone` runs once the attempt is over, landed or not. Returns a cancel
 * function for when the editor unmounts first.
 */
export function focusEditorWhenShown(
  handle: NoteEditorHandle,
  selection: 'start' | 'end',
  container: () => HTMLElement | null,
  onDone: () => void,
): () => void {
  const doc = globalThis.document
  const focusedBefore = doc.activeElement
  let framesLeft = MAX_FRAMES
  let frame: number | null = null
  let cancelled = false

  const landed = (): boolean => container()?.contains(doc.activeElement) === true
  const hidden = (): boolean => {
    const element = container()
    return element !== null && getComputedStyle(element).visibility === 'hidden'
  }

  const attempt = (): void => {
    frame = null
    if (cancelled) {
      return
    }
    handle.focus()
    // By default the caret lands at the document start. An `end` selection
    // moves it (and the scroll) to the note's content end.
    if (selection === 'end') {
      handle.setSelection('end')
    }
    if (landed() || !hidden() || framesLeft <= 0) {
      onDone()
      return
    }
    framesLeft -= 1
    frame = requestAnimationFrame(retry)
  }

  const retry = (): void => {
    frame = null
    // A failed `focus()` leaves focus where it was, so any other change is
    // the user's doing: leave them there.
    if (landed() || doc.activeElement !== focusedBefore) {
      onDone()
      return
    }
    attempt()
  }

  // Called from the editor's ref, before React attaches the refs of the
  // elements around it (the container among them). A microtask still runs
  // before the browser paints, with every ref of this commit in place.
  if (container() === null) {
    queueMicrotask(attempt)
  } else {
    attempt()
  }
  return () => {
    cancelled = true
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }
}
