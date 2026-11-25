import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestCoreServices,
  createTestDatabaseService,
  type TestCoreServices,
} from '@reflect/core/testing'
import { createTestAppServices, type TestAppServices } from '../testing/services.ts'
import { APP_COMMANDS } from './app-commands.ts'
import { normalizeBinding } from './keybindings.ts'
import { copyNoteRelativePath } from './copy-relative-path.ts'

let core: TestCoreServices
let appLayer: TestAppServices

beforeEach(() => {
  core = createTestCoreServices({ database: createTestDatabaseService() })
  appLayer = createTestAppServices(core)
})

afterEach(() => {
  core.database.close()
})

describe('copyNoteRelativePath', () => {
  it('copies the graph-relative path and confirms through operations', async () => {
    await copyNoteRelativePath(appLayer, 'notes/Trip to Oslo.md')
    expect(appLayer.clipboard.writes()).toEqual(['notes/Trip to Oslo.md'])
    expect(core.progress.started()).toMatchObject([{ label: 'Relative path copied', ended: true }])
  })

  it('copies a daily note by its path, not its date', async () => {
    await copyNoteRelativePath(appLayer, 'daily/2026-11-25.md')
    expect(appLayer.clipboard.writes()).toEqual(['daily/2026-11-25.md'])
  })

  it('reports a clipboard failure', async () => {
    appLayer.clipboard.failWith(new Error('denied'))
    await copyNoteRelativePath(appLayer, 'notes/a.md')
    expect(core.progress.snapshot()).toMatchObject([
      { label: 'Copying relative path', status: 'failed', message: 'denied' },
    ])
  })
})

describe('note.copyRelativePath', () => {
  // Zed's pair: ⌥⌘C copies the absolute path, ⇧⌥⌘C the relative one.
  it('is ⌥⌘C with Shift', () => {
    const relative = APP_COMMANDS['note.copyRelativePath'].keybinding
    const absolute = APP_COMMANDS['note.copyPath'].keybinding
    expect(normalizeBinding(relative, true)).toBe(normalizeBinding(`Shift-${absolute}`, true))
  })
})
