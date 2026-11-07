import type { NoteEditorHandle } from '@/editor/note-editor.tsx'

/**
 * The mounted note editors, keyed by graph-relative note path. Commands that
 * act on "the current note's editor" (Attach file…) resolve the handle for
 * `CommandContext.notePath()` here — the same path the context sidebar and
 * note-scoped commands target, so an insertion can never land in a different
 * note than the one those commands describe.
 *
 * Module-level rather than a provider: registrations come from render-phase
 * ref callbacks and reads from command dispatch, neither of which needs
 * React state or re-renders.
 */
const handles = new Map<string, NoteEditorHandle>()

/**
 * A change to a note's mounted editor: it mounted (read its document through
 * {@link noteEditorHandleFor} once the commit settles), or the user edited it.
 */
export type NoteEditorEvent =
  | { readonly kind: 'mounted'; readonly path: string }
  | { readonly kind: 'edited'; readonly path: string; readonly markdown: string }

type NoteEditorListener = (event: NoteEditorEvent) => void

const listeners = new Set<NoteEditorListener>()

function emit(event: NoteEditorEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}

/**
 * Follow every mounted editor's mounts and edits (focus mode's live writing
 * statistics). Listeners run synchronously inside the editor's commit or
 * change handler: defer real work. Returns the unsubscribe.
 */
export function subscribeNoteEditors(listener: NoteEditorListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Report the user's edit of `path`'s editor (the pane's `onChange`). */
export function reportNoteEdited(path: string, markdown: string): void {
  emit({ kind: 'edited', path, markdown })
}

/** Make `handle` the editor for `path` (the pane's ref callback, on mount). */
export function registerNoteEditorHandle(path: string, handle: NoteEditorHandle): void {
  handles.set(path, handle)
  emit({ kind: 'mounted', path })
}

/**
 * Remove `handle`'s registration (the pane's ref callback, on unmount). A
 * no-op when another editor has since registered the same path, so an
 * unmount racing a remount never drops the live handle.
 */
export function unregisterNoteEditorHandle(path: string, handle: NoteEditorHandle): void {
  if (handles.get(path) === handle) {
    handles.delete(path)
  }
}

/** The mounted editor for a note path, or null when none is on screen. */
export function noteEditorHandleFor(path: string): NoteEditorHandle | null {
  return handles.get(path) ?? null
}
