import { useMemo } from 'react'
import { useExtension } from '@meowdown/react'
import { defineFocusDim, type FocusDimMode } from './focus-dim.ts'
import { defineTypewriter } from './typewriter.ts'
import './focus-dim.css'

interface FocusModeEditorExtensionsProps {
  /** What stays at full strength while the rest dims; undefined dims nothing. */
  dim: FocusDimMode | undefined
  /** Whether the caret line stays vertically centered. */
  typewriter: boolean
}

/**
 * Focus mode's editor behaviour, mounted inside the note editor's ProseKit
 * context (meowdown renders `NoteEditor`'s children there). Render it only
 * while focus mode is on: unmounting removes both extensions.
 */
export function FocusModeEditorExtensions({
  dim,
  typewriter,
}: FocusModeEditorExtensionsProps): null {
  const dimExtension = useMemo(() => (dim === undefined ? null : defineFocusDim(dim)), [dim])
  const typewriterExtension = useMemo(() => (typewriter ? defineTypewriter() : null), [typewriter])
  useExtension(dimExtension)
  useExtension(typewriterExtension)
  return null
}
