import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTestCoreServices,
  createTestDatabaseService,
  type TestCoreServices,
} from '@reflect/core/testing'
import { createTestAppServices, type TestAppServices } from '../testing/services.ts'
import { APP_COMMANDS } from './app-commands.ts'
import { APP_MENU_LAYOUT } from './app-menu.ts'
import { revealNoteInFileManager } from './reveal-note.ts'

let core: TestCoreServices
let appLayer: TestAppServices

beforeEach(() => {
  core = createTestCoreServices({ database: createTestDatabaseService() })
  appLayer = createTestAppServices(core)
})

afterEach(() => {
  core.database.close()
})

describe('revealNoteInFileManager', () => {
  it('reveals the absolute note path without a status line', async () => {
    core.graphSession.setGraph({ generation: 1 })
    const absolutePathFor = vi
      .spyOn(core.noteActions, 'absolutePathFor')
      .mockResolvedValue('/g/notes/a.md')
    await revealNoteInFileManager(core, appLayer, 'notes/a.md')
    expect(absolutePathFor).toHaveBeenCalledWith('notes/a.md')
    expect(appLayer.opener.revealedPaths()).toEqual(['/g/notes/a.md'])
    expect(core.progress.get()).toEqual([])
  })

  it('fails loudly when no graph is open', async () => {
    core.graphSession.setGraph(null)
    await revealNoteInFileManager(core, appLayer, 'notes/a.md')
    expect(appLayer.opener.revealedPaths()).toEqual([])
    expect(core.progress.snapshot()).toMatchObject([
      { label: 'Revealing note', status: 'failed', message: 'No graph is open' },
    ])
  })

  it('reports a failure to resolve the path', async () => {
    core.graphSession.setGraph({ generation: 1 })
    vi.spyOn(core.noteActions, 'absolutePathFor').mockRejectedValue(new Error('gone'))
    await revealNoteInFileManager(core, appLayer, 'notes/a.md')
    expect(appLayer.opener.revealedPaths()).toEqual([])
    expect(core.progress.snapshot()).toMatchObject([
      { label: 'Revealing note', status: 'failed', message: 'gone' },
    ])
  })

  it('reports a file manager failure', async () => {
    core.graphSession.setGraph({ generation: 1 })
    vi.spyOn(core.noteActions, 'absolutePathFor').mockResolvedValue('/g/notes/a.md')
    appLayer.opener.failWith(new Error('no file manager'))
    await revealNoteInFileManager(core, appLayer, 'notes/a.md')
    expect(core.progress.snapshot()).toMatchObject([
      { label: 'Revealing note', status: 'failed', message: 'no file manager' },
    ])
  })
})

describe('note.revealInFinder', () => {
  // Zed's Reveal in Finder chord.
  it('is bound to ⌥⌘R', () => {
    expect(APP_COMMANDS['note.revealInFinder'].keybinding).toBe('Alt-Mod-r')
  })

  it('sits in the File menu', () => {
    const file = APP_MENU_LAYOUT.find((submenu) => submenu.text === 'File')
    expect(file?.entries).toContainEqual(
      expect.objectContaining({ kind: 'command', commandId: 'note.revealInFinder' }),
    )
  })
})
