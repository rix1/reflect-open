/**
 * A change to a note's text as focus mode sees it: an editor for `path`
 * started showing it (read the text through `noteEditorHandleFor` once the
 * commit settles), or its document changed. Reported from inside the editor
 * by `FocusModeNoteExtensions`, so the counter needs no hook in the note pane.
 */
export interface NoteTextChange {
  readonly kind: 'mounted' | 'edited'
  readonly path: string
}

type NoteTextListener = (change: NoteTextChange) => void

const listeners = new Set<NoteTextListener>()

/**
 * Follow every focus-mode editor's mounts and edits (the live writing
 * statistics). Listeners run synchronously inside the editor's transaction:
 * defer real work. Returns the unsubscribe.
 */
export function subscribeNoteTextChanges(listener: NoteTextListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Report that `path`'s editor mounted or its document changed. */
export function reportNoteTextChange(change: NoteTextChange): void {
  for (const listener of listeners) {
    listener(change)
  }
}
