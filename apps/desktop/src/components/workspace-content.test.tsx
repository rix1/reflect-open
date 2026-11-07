import { page } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import type { ReactElement } from 'react'
import { createTestCoreServices, seedNotes } from '@reflect/core/testing'
import { PaletteProvider } from '@/components/command-palette/palette-provider.tsx'
import { type GraphInfo, type Settings, formatDayLabel } from '@reflect/core'
import type { Route } from '@reflect/app'
import { AudioMemoProvider } from '@/providers/audio-memo-provider.tsx'
import { DeepLinkProvider } from '@/providers/deep-link-provider.tsx'
import { FocusedDailyProvider } from '@/providers/focused-daily-provider.tsx'
import { NoteFindProvider } from '@/providers/note-find-provider.tsx'
import { NoteTemplatesProvider } from '@/providers/note-templates-provider.tsx'
import { ShortcutsProvider } from '@/providers/shortcuts-provider.tsx'
import { FocusModeProvider, useFocusMode } from '@/providers/focus-mode-provider.tsx'
import { SidebarProvider, useSidebar } from '@/providers/sidebar-provider.tsx'
import { V1ImportProvider } from '@/providers/v1-import-provider.tsx'
import { renderInApp } from '@/test-utils/render-in-app.tsx'
import { createWasmTestDatabaseService } from '@/test-utils/test-database.ts'
import { WorkspaceContent } from './workspace-content.tsx'

const GRAPH: GraphInfo = { root: '/notes', name: 'Notes', generation: 1 }

/**
 * Toggles focus mode the way the "Toggle focus mode" command does.
 */
function FocusModeToggle(): ReactElement {
  const { toggleFocusMode } = useFocusMode()
  return (
    <button type="button" onClick={toggleFocusMode}>
      Toggle focus mode
    </button>
  )
}

/**
 * Toggles the sidebar the way the "Toggle sidebar" command does.
 */
function SidebarToggle(): ReactElement {
  const { toggleSidebar } = useSidebar()
  return (
    <button type="button" onClick={toggleSidebar}>
      Toggle sidebar
    </button>
  )
}

function renderWorkspace(route: Route, settings?: Partial<Settings>) {
  const core = createTestCoreServices({ database: createWasmTestDatabaseService() })
  onTestFinished(() => core.database.close())
  // Pinned, so the sidebar of this note (and only this note) offers "Un-pin this note".
  seedNotes(core.database, [
    { path: 'notes/project.md', markdown: '---\npinned: true\n---\n# Project\n' },
  ])
  // The providers of `GraphWorkspace`, inside the router of `renderInApp`.
  return renderInApp(
    <PaletteProvider>
      <ShortcutsProvider>
        <NoteTemplatesProvider>
          <SidebarProvider>
            <FocusModeProvider>
              <AudioMemoProvider graph={GRAPH}>
                <DeepLinkProvider>
                  <FocusedDailyProvider>
                    <NoteFindProvider>
                      <V1ImportProvider>
                        <WorkspaceContent graph={GRAPH} />
                        <SidebarToggle />
                        <FocusModeToggle />
                      </V1ImportProvider>
                    </NoteFindProvider>
                  </FocusedDailyProvider>
                </DeepLinkProvider>
              </AudioMemoProvider>
            </FocusModeProvider>
          </SidebarProvider>
        </NoteTemplatesProvider>
      </ShortcutsProvider>
    </PaletteProvider>,
    {
      core,
      graph: GRAPH,
      route,
      // The AppShell asides mount resize handles, which read the persisted widths.
      settings: { sidebarWidth: 260, contextSidebarWidth: 320, dateFormat: 'mdy', ...settings },
    },
  )
}

beforeEach(async () => {
  // The context sidebar is `hidden lg:block`, so it only renders on a
  // desktop-width viewport.
  await page.viewport(1280, 800)
})

afterEach(async () => {
  await page.viewport(900, 600)
  delete document.documentElement.dataset['focusMode']
  delete document.documentElement.dataset['focusTypewriter']
})

describe('WorkspaceContent', () => {
  it('hides and restores the workspace and daily context sidebars together', async () => {
    const view = await renderWorkspace({ kind: 'daily', date: '2026-07-11' })
    const toggle = view.getByRole('button', { name: 'Toggle sidebar' })

    await expect.element(view.getByRole('complementary', { name: 'Workspace' })).toBeInTheDocument()
    await expect.element(view.getByRole('complementary', { name: 'Context' })).toBeInTheDocument()
    await expect
      .element(
        view
          .getByTestId('daily-context-sidebar')
          .getByRole('button', { name: formatDayLabel('2026-07-11', 'mdy') }),
      )
      .toHaveAttribute('aria-pressed', 'true')

    await toggle.click()
    await expect
      .element(view.getByRole('complementary', { name: 'Workspace' }))
      .not.toBeInTheDocument()
    expect(view.getByRole('complementary', { name: 'Context' }).query()).toBeNull()

    await toggle.click()
    await expect.element(view.getByRole('complementary', { name: 'Workspace' })).toBeInTheDocument()
    await expect.element(view.getByRole('complementary', { name: 'Context' })).toBeInTheDocument()
  })

  it('applies the same collapsed state to ordinary note context', async () => {
    const view = await renderWorkspace({ kind: 'note', path: 'notes/project.md' })
    const context = view.getByRole('complementary', { name: 'Context' })
    await expect.element(context.getByTestId('note-context-sidebar')).toBeInTheDocument()
    await expect
      .element(context.getByRole('button', { name: 'Un-pin this note' }))
      .toBeInTheDocument()

    await view.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect
      .element(view.getByRole('complementary', { name: 'Context' }))
      .not.toBeInTheDocument()
  })

  it('focus mode hides both sidebars and restores the layout it found', async () => {
    const view = await renderWorkspace({ kind: 'daily', date: '2026-07-11' })
    const focusToggle = view.getByRole('button', { name: 'Toggle focus mode' })
    await expect.element(view.getByRole('complementary', { name: 'Workspace' })).toBeInTheDocument()

    await focusToggle.click()
    await expect
      .element(view.getByRole('complementary', { name: 'Workspace' }))
      .not.toBeInTheDocument()
    expect(view.getByRole('complementary', { name: 'Context' }).query()).toBeNull()
    expect(document.documentElement.dataset['focusMode']).toBe('true')
    expect(document.documentElement.dataset['focusTypewriter']).toBe('true')

    await focusToggle.click()
    await expect.element(view.getByRole('complementary', { name: 'Workspace' })).toBeInTheDocument()
    await expect.element(view.getByRole('complementary', { name: 'Context' })).toBeInTheDocument()
    expect(document.documentElement.dataset['focusMode']).toBeUndefined()
  })

  it('leaves a sidebar the user collapsed collapsed after focus mode', async () => {
    const view = await renderWorkspace({ kind: 'daily', date: '2026-07-11' })
    await view.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect
      .element(view.getByRole('complementary', { name: 'Workspace' }))
      .not.toBeInTheDocument()

    const focusToggle = view.getByRole('button', { name: 'Toggle focus mode' })
    await focusToggle.click()
    await focusToggle.click()

    expect(view.getByRole('complementary', { name: 'Workspace' }).query()).toBeNull()
  })

  it('stays windowed by default', async () => {
    const view = await renderWorkspace({ kind: 'daily', date: '2026-07-11' })
    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    await expect
      .element(view.getByRole('complementary', { name: 'Workspace' }))
      .not.toBeInTheDocument()
    expect(view.appServices.window.fullscreenCalls()).toEqual([])
  })

  it('takes the window full screen on entry and back out on exit when asked to', async () => {
    const view = await renderWorkspace(
      { kind: 'daily', date: '2026-07-11' },
      { focusModeFullscreen: true },
    )
    const focusToggle = view.getByRole('button', { name: 'Toggle focus mode' })

    await focusToggle.click()
    await vi.waitFor(() => expect(view.appServices.window.fullscreenCalls()).toEqual([true]))
    await focusToggle.click()
    await vi.waitFor(() => expect(view.appServices.window.fullscreenCalls()).toEqual([true, false]))
  })
})
