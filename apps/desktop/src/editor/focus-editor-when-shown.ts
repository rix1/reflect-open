import type { NoteEditorHandle } from '@/editor/note-editor.tsx'

// About half a second at 60Hz: long enough for a virtualized row to be
// measured and shown, short enough that a focus that never lands gives up
// before the user notices it arrive late.
const MAX_FRAMES = 30

/**
 * Focus a freshly mounted editor, with the caret at `selection`, as soon as it
 * can take focus. A virtualized row (the daily stream's virtua list) stays
 * `visibility: hidden` until it is measured, and the browser silently ignores
 * `focus()` on a hidden element, so the attempt repeats once per frame until
 * focus lands inside `container()`. It stops early when the user moves focus
 * somewhere else in the meantime.
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

  const landed = (): boolean => container()?.contains(doc.activeElement) === true

  const attempt = (): void => {
    frame = null
    handle.focus()
    // By default the caret lands at the document start. An `end` selection
    // moves it (and the scroll) to the note's content end.
    if (selection === 'end') {
      handle.setSelection('end')
    }
    if (landed() || framesLeft <= 0) {
      onDone()
      return
    }
    framesLeft -= 1
    frame = requestAnimationFrame(retry)
  }

  const retry = (): void => {
    frame = null
    if (landed()) {
      onDone()
      return
    }
    // A failed `focus()` leaves focus where it was, so any other change is
    // the user's doing: leave them there.
    if (doc.activeElement !== focusedBefore) {
      onDone()
      return
    }
    attempt()
  }

  attempt()
  return () => {
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }
}
