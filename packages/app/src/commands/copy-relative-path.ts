import { errorMessage } from '@reflect/core'
import type { ClipboardActionServices } from './clipboard-actions.ts'

/**
 * Put the note's graph-relative path (`notes/plan.md`, `daily/2026-11-25.md`)
 * on the clipboard and report through the operations status line: the short
 * twin of `copyNotePath`, and an address `reflect show` resolves against the
 * graph. Never rejects.
 */
export async function copyNoteRelativePath(
  { clipboard, operations }: ClipboardActionServices,
  path: string,
): Promise<void> {
  try {
    await clipboard.writeText(path)
    operations.start('Relative path copied').done()
  } catch (cause) {
    operations.start('Copying relative path').fail(errorMessage(cause))
  }
}
