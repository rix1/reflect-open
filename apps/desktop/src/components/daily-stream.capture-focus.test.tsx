import { page, userEvent } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, onTestFinished } from 'vitest'
import type { ReactElement } from 'react'
import { createSystemClock, dailyPath, formatDayLabel, type GraphInfo } from '@reflect/core'
import { createTestCoreServices, createTestNoteFileService, seedNotes } from '@reflect/core/testing'
import { getIsoToday } from '@reflect/utils'
import type { Route } from '@reflect/app'
import { PaletteProvider } from '@/components/command-palette/palette-provider.tsx'
import { AudioMemoProvider } from '@/providers/audio-memo-provider.tsx'
import { DeepLinkProvider } from '@/providers/deep-link-provider.tsx'
import { FocusedDailyProvider } from '@/providers/focused-daily-provider.tsx'
import { NoteFindProvider } from '@/providers/note-find-provider.tsx'
import { NoteTemplatesProvider } from '@/providers/note-templates-provider.tsx'
import { ShortcutsProvider } from '@/providers/shortcuts-provider.tsx'
import { SidebarProvider } from '@/providers/sidebar-provider.tsx'
import { V1ImportProvider } from '@/providers/v1-import-provider.tsx'
import { useRouterActions } from '@/routing/router.tsx'
import { renderInApp } from '@/test-utils/render-in-app.tsx'
import { createWasmTestDatabaseService } from '@/test-utils/test-database.ts'
import { WorkspaceContent } from './workspace-content.tsx'

/**
 * ⌘D end to end, with real editors: today's editor takes focus with the caret
 * at the end of its content. The stream's own tests probe the props it hands
 * NotePane; this covers the mount itself, where a just-rendered virtua row is
 * still `visibility: hidden` and ignores a plain `focus()`.
 */

const GRAPH: GraphInfo = { root: '/notes', name: 'Notes', generation: 1 }

function GoToToday(): ReactElement {
  const { navigate } = useRouterActions()
  return (
    <button type="button" onClick={() => navigate({ kind: 'today' }, { focusEditor: true })}>
      Go to today
    </button>
  )
}

const today = getIsoToday()
const TODAY_MD = '- first line\n- last line\n'

function renderWorkspace(route: Route) {
  const core = createTestCoreServices({
    database: createWasmTestDatabaseService(),
    clock: createSystemClock(),
    noteFile: createTestNoteFileService({
      files: { [dailyPath(today)]: TODAY_MD, 'notes/other.md': '# Other\n\nBody.\n' },
    }),
  })
  onTestFinished(() => core.database.close())
  seedNotes(core.database, [
    { path: dailyPath(today), markdown: TODAY_MD },
    { path: 'notes/other.md', markdown: '# Other\n\nBody.\n' },
  ])
  return renderInApp(
    <PaletteProvider>
      <ShortcutsProvider>
        <NoteTemplatesProvider>
          <SidebarProvider>
            <AudioMemoProvider graph={GRAPH}>
              <DeepLinkProvider>
                <FocusedDailyProvider>
                  <NoteFindProvider>
                    <V1ImportProvider>
                      <WorkspaceContent graph={GRAPH} />
                      <GoToToday />
                    </V1ImportProvider>
                  </NoteFindProvider>
                </FocusedDailyProvider>
              </DeepLinkProvider>
            </AudioMemoProvider>
          </SidebarProvider>
        </NoteTemplatesProvider>
      </ShortcutsProvider>
    </PaletteProvider>,
    {
      core,
      graph: GRAPH,
      route,
      settings: { sidebarWidth: 260, contextSidebarWidth: 320, dateFormat: 'mdy' },
    },
  )
}

function todayEditor(): HTMLElement | null {
  const label = formatDayLabel(today, 'mdy')
  for (const h2 of document.querySelectorAll('section h2')) {
    if (h2.textContent === label) {
      return h2.closest('section')?.querySelector<HTMLElement>('[contenteditable="true"]') ?? null
    }
  }
  return null
}

/** Where the caret is: `end` of today's note, or what went wrong. */
function caretState(): string {
  const editor = todayEditor()
  if (editor === null) return 'no editor'
  const active = document.activeElement
  if (active === null || !editor.contains(active)) {
    return `not focused (${active === null ? 'nothing' : active.tagName})`
  }
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) return 'no selection'
  const after = document.createRange()
  after.setStart(selection.focusNode!, selection.focusOffset)
  after.setEndAfter(editor.lastChild!)
  return after.toString() === '' ? 'end' : `mid (${JSON.stringify(after.toString())})`
}

beforeEach(async () => {
  await page.viewport(1280, 800)
})
afterEach(async () => {
  await page.viewport(900, 600)
})

describe('⌘D: caret at the end of today', () => {
  it('from another note', async () => {
    await renderWorkspace({ kind: 'note', path: 'notes/other.md' })
    await expect.poll(() => document.querySelector('[contenteditable="true"]')).not.toBeNull()
    await userEvent.keyboard('{Meta>}d{/Meta}')
    await expect.poll(caretState).toBe('end')
  })

  it('from today, with focus outside the editor', async () => {
    const view = await renderWorkspace({ kind: 'today' })
    await expect.poll(() => todayEditor()).not.toBeNull()
    await view.getByRole('button', { name: 'Go to today' }).click()
    await expect.poll(caretState).toBe('end')
  })

  it('from today, with the caret at the start of the note', async () => {
    const view = await renderWorkspace({ kind: 'today' })
    await expect.poll(() => todayEditor()).not.toBeNull()
    todayEditor()!.focus()
    await view.getByRole('button', { name: 'Go to today' }).click()
    await expect.poll(caretState).toBe('end')
  })
})
