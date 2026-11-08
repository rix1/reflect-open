import { page } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import type { ReactElement } from 'react'
import type { GraphInfo, Settings } from '@reflect/core'
import type { Route } from '@reflect/app'
import { createTestCoreServices, createTestNoteFileService, seedNotes } from '@reflect/core/testing'
import { PaletteProvider } from '@/components/command-palette/palette-provider.tsx'
import { WorkspaceContent } from '@/components/workspace-content.tsx'
import { AudioMemoProvider } from '@/providers/audio-memo-provider.tsx'
import { DeepLinkProvider } from '@/providers/deep-link-provider.tsx'
import { FocusedDailyProvider } from '@/providers/focused-daily-provider.tsx'
import { NoteFindProvider } from '@/providers/note-find-provider.tsx'
import { NoteTemplatesProvider } from '@/providers/note-templates-provider.tsx'
import { ShortcutsProvider } from '@/providers/shortcuts-provider.tsx'
import { SidebarProvider, useSidebar } from '@/providers/sidebar-provider.tsx'
import { V1ImportProvider } from '@/providers/v1-import-provider.tsx'
import { useRouterActions } from '@/routing/router.tsx'
import { renderInApp } from '@/test-utils/render-in-app.tsx'
import '@/test-utils/locator.ts'
import { createWasmTestDatabaseService } from '@/test-utils/test-database.ts'
import { FocusModeProvider, useFocusMode } from './focus-mode-provider.tsx'

/*
 * Focus mode across the workspace, mounted the way `GraphWorkspace` mounts it.
 * Lives with the feature rather than in the upstream workspace tests, and pins
 * the upstream names `focus-mode.css` hides by.
 */

// Raw source, for pinning a name (a `?raw` default import trips oxlint).
const SOURCES = import.meta.glob<string>('../components/suggested-contact-card.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const GRAPH: GraphInfo = { root: '/notes', name: 'Notes', generation: 1 }

function FocusModeToggle(): ReactElement {
  const { toggleFocusMode } = useFocusMode()
  return (
    <button type="button" onClick={toggleFocusMode}>
      Toggle focus mode
    </button>
  )
}

function SidebarToggle(): ReactElement {
  const { toggleSidebar } = useSidebar()
  return (
    <button type="button" onClick={toggleSidebar}>
      Toggle sidebar
    </button>
  )
}

function NavigateButtons(): ReactElement {
  const { navigate, back } = useRouterActions()
  return (
    <>
      <button type="button" onClick={() => navigate({ kind: 'note', path: 'notes/other.md' })}>
        Open other
      </button>
      <button type="button" onClick={() => navigate({ kind: 'today' }, { focusEditor: true })}>
        Go to today
      </button>
      <button type="button" onClick={back}>
        Back
      </button>
    </>
  )
}

const ESSAY = '# Essay\n\nA first sentence.\n'
const SPACING = '# Spacing\n\nFirst paragraph.\n\nSecond paragraph.\n\n- one\n- two\n'

function renderWorkspace(route: Route, settings?: Partial<Settings>) {
  const core = createTestCoreServices({
    database: createWasmTestDatabaseService(),
    noteFile: createTestNoteFileService({
      files: { 'notes/essay.md': ESSAY, 'notes/spacing.md': SPACING },
    }),
  })
  onTestFinished(() => core.database.close())
  seedNotes(core.database, [
    { path: 'notes/essay.md', markdown: ESSAY },
    { path: 'notes/spacing.md', markdown: SPACING },
    { path: 'notes/other.md', markdown: '# Other\n\nSee [[Essay]].\n' },
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
                      <FocusModeProvider>
                        <WorkspaceContent graph={GRAPH} />
                        <FocusModeToggle />
                        <NavigateButtons />
                      </FocusModeProvider>
                      <SidebarToggle />
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
      settings: { sidebarWidth: 260, contextSidebarWidth: 320, dateFormat: 'mdy', ...settings },
    },
  )
}

beforeEach(async () => {
  // The context sidebar only renders on a desktop-width viewport.
  await page.viewport(1280, 800)
})

afterEach(async () => {
  await page.viewport(900, 600)
})

describe('focus mode', () => {
  it('hides both sidebars and restores the layout it found', async () => {
    const view = await renderWorkspace({ kind: 'daily', date: '2026-07-11' })
    const focusToggle = view.getByRole('button', { name: 'Toggle focus mode' })
    const workspace = view.getByRole('complementary', { name: 'Workspace' })
    await expect.element(workspace).toBeInTheDocument()

    await focusToggle.click()
    await expect.element(workspace).not.toBeInTheDocument()
    expect(view.getByRole('complementary', { name: 'Context' }).query()).toBeNull()
    expect(document.documentElement.dataset['focusMode']).toBe('true')
    expect(document.documentElement.dataset['focusTypewriter']).toBe('true')

    await focusToggle.click()
    await expect.element(workspace).toBeInTheDocument()
    await expect.element(view.getByRole('complementary', { name: 'Context' })).toBeInTheDocument()
    expect(document.documentElement.dataset['focusMode']).toBeUndefined()
  })

  // Settings is one more route change (its screen needs services this harness
  // lacks), so these stand in for it.
  it('ends when navigating anywhere: another note, today, back', async () => {
    const view = await renderWorkspace({ kind: 'note', path: 'notes/essay.md' })
    const focusToggle = view.getByRole('button', { name: 'Toggle focus mode' })
    const workspace = view.getByRole('complementary', { name: 'Workspace' })
    await expect.element(workspace).toBeInTheDocument()

    for (const name of ['Open other', 'Go to today', 'Back']) {
      await focusToggle.click()
      await expect.element(workspace).not.toBeInTheDocument()
      expect(document.documentElement.dataset['focusMode'], name).toBe('true')

      await view.getByRole('button', { name }).click()
      await expect.element(workspace).toBeInTheDocument()
      expect(document.documentElement.dataset['focusMode'], name).toBeUndefined()
    }
  })

  it('leaves a sidebar the user collapsed collapsed', async () => {
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

  it('hides the backlinks under a note, and brings them back after', async () => {
    // Narrow enough that they render under the note, not in the context sidebar.
    await page.viewport(900, 600)
    const view = await renderWorkspace({ kind: 'note', path: 'notes/essay.md' })
    // By the attribute, not the role: a role query skips `display: none`.
    const backlinks = page.locate('[aria-label="Incoming backlinks"]')
    await expect.element(backlinks).toBeVisible()

    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    await expect.element(backlinks).not.toBeVisible()

    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    await expect.element(backlinks).toBeVisible()
  })

  it('hides the block grip', async () => {
    const view = await renderWorkspace({ kind: 'note', path: 'notes/essay.md' })
    await view.getByText('A first sentence.').hover()
    const grip = page.getByTestId('block-handle')
    await expect.element(grip).toBeVisible()

    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    await view.getByText('A first sentence.').hover()
    await expect.element(grip).not.toBeVisible()
  })

  it('sets iA-like typography: 17px text, a blank line between paragraphs, tight lists', async () => {
    const view = await renderWorkspace({ kind: 'note', path: 'notes/spacing.md' })
    await expect.element(view.getByText('Second paragraph.')).toBeInTheDocument()
    await view.getByRole('button', { name: 'Toggle focus mode' }).click()

    const surface = document.querySelector<HTMLElement>('.reflect-note-surface')
    if (surface === null) {
      throw new Error('missing note surface')
    }
    await vi.waitFor(() => expect(getComputedStyle(surface).fontSize).toBe('17px'))
    const lineHeight = Number.parseFloat(getComputedStyle(surface).lineHeight)

    const top = (text: string): number => view.getByText(text).element().getBoundingClientRect().top
    // A blank line between paragraphs: the next one starts two lines down.
    expect(top('Second paragraph.') - top('First paragraph.')).toBeCloseTo(2 * lineHeight, -1)
    // List items stay a line apart.
    expect(top('two') - top('one')).toBeLessThan(1.6 * lineHeight)
  })

  it('applies the typography settings', async () => {
    const view = await renderWorkspace(
      { kind: 'note', path: 'notes/spacing.md' },
      { focusModeTextSize: -2, focusModeParagraphSpacing: 'tight' },
    )
    await expect.element(view.getByText('Second paragraph.')).toBeInTheDocument()
    await view.getByRole('button', { name: 'Toggle focus mode' }).click()

    const surface = document.querySelector<HTMLElement>('.reflect-note-surface')
    if (surface === null) {
      throw new Error('missing note surface')
    }
    await vi.waitFor(() => expect(getComputedStyle(surface).fontSize).toBe('15px'))
    const lineHeight = Number.parseFloat(getComputedStyle(surface).lineHeight)
    const top = (text: string): number => view.getByText(text).element().getBoundingClientRect().top
    expect(top('Second paragraph.') - top('First paragraph.')).toBeLessThan(1.6 * lineHeight)
  })

  it('grows the text with the window at three breakpoints, like iA Writer', async () => {
    const view = await renderWorkspace({ kind: 'note', path: 'notes/spacing.md' })
    await expect.element(view.getByText('Second paragraph.')).toBeInTheDocument()
    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    const surface = document.querySelector<HTMLElement>('.reflect-note-surface')
    if (surface === null) {
      throw new Error('missing note surface')
    }

    for (const [width, size] of [
      [1000, '15px'],
      [1280, '17px'],
      [1500, '19px'],
    ] as const) {
      await page.viewport(width, 800)
      await vi.waitFor(() => expect(getComputedStyle(surface).fontSize).toBe(size))
    }
  })

  it('shows the writing counter only while on', async () => {
    const view = await renderWorkspace({ kind: 'note', path: 'notes/essay.md' })
    const counter = page.getByRole('button', { name: 'Writing statistics' })
    await expect.element(view.getByText('A first sentence.')).toBeInTheDocument()
    expect(counter.query()).toBeNull()

    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    await expect.element(counter).toHaveTextContent('4 words')

    await view.getByRole('button', { name: 'Toggle focus mode' }).click()
    await expect.element(counter).not.toBeInTheDocument()
  })

  // The contact card needs a person-like note to appear; pin its name instead.
  it('still finds the contact card by the name focus-mode.css hides it by', () => {
    expect(SOURCES['../components/suggested-contact-card.tsx']).toContain(
      'aria-label="Suggested contact"',
    )
  })
})
