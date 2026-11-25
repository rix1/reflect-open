import { useEffect, useMemo, type ReactElement } from 'react'
import { useExtension } from '@meowdown/react'
import { defineDocChangeHandler } from '@prosekit/core'
import { useFocusModeActive } from '../focus-mode-provider.tsx'
import { reportNoteTextChange } from '../note-text-changes.ts'
import { useFocusModeDim, useFocusModeTypewriter } from '../use-focus-mode-settings.ts'
import { FocusModeEditorExtensions } from './focus-mode-editor-extensions.tsx'

interface FocusModeNoteExtensionsProps {
  /** The note this editor shows, for the writing counter. */
  path: string
}

/**
 * Everything focus mode adds to a note's editor, rendered once as a child of
 * `NoteEditor` (inside its ProseKit context) and inert until focus mode is
 * on. It then dims, scrolls like a typewriter and tells the writing counter
 * when this note's text changes, so the note pane needs no other wiring.
 */
export function FocusModeNoteExtensions({
  path,
}: FocusModeNoteExtensionsProps): ReactElement | null {
  const active = useFocusModeActive()
  const dim = useFocusModeDim()
  const typewriter = useFocusModeTypewriter()

  const textChanges = useMemo(() => {
    return active
      ? defineDocChangeHandler(() => {
          reportNoteTextChange({ kind: 'edited', path })
        })
      : null
  }, [active, path])
  useExtension(textChanges)

  useEffect(() => {
    if (active) {
      reportNoteTextChange({ kind: 'mounted', path })
    }
  }, [active, path])

  if (!active) {
    return null
  }
  return <FocusModeEditorExtensions dim={dim === 'off' ? undefined : dim} typewriter={typewriter} />
}
