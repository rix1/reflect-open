import { errorMessage, type CoreServices } from '@reflect/core'
import type { OpenerService } from '../app/opener-service.ts'
import type { OperationsService } from '../app/operations-service.ts'

/**
 * The app services that reveal a note and report a failure.
 */
export interface RevealNoteServices {
  readonly opener: OpenerService
  readonly operations: OperationsService
}

/**
 * Show the note's markdown file, selected, in the system file manager. Finder
 * coming forward is the confirmation, so only a failure reaches the operations
 * status line. Never rejects.
 */
export async function revealNoteInFileManager(
  { noteActions, graphSession }: CoreServices,
  { opener, operations }: RevealNoteServices,
  path: string,
): Promise<void> {
  if (graphSession.get().session === null) {
    operations.start('Revealing note').fail('No graph is open')
    return
  }
  try {
    await opener.revealInFileManager(await noteActions.absolutePathFor(path))
  } catch (cause) {
    operations.start('Revealing note').fail(errorMessage(cause))
  }
}
