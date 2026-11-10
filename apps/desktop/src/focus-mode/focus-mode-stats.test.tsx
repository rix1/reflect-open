import { page } from 'vitest/browser'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
  registerNoteEditorHandle,
  unregisterNoteEditorHandle,
} from '@/editor/editor-handle-registry.ts'
import type { NoteEditorHandle } from '@/editor/note-editor.tsx'
import { FocusedDailyProvider } from '@/providers/focused-daily-provider.tsx'
import { act } from '@/test-utils/act.ts'
import { renderInApp } from '@/test-utils/render-in-app.tsx'
import '@/test-utils/locator.ts'
import { FocusModeStats } from './focus-mode-stats.tsx'
import { reportNoteTextChange } from './note-text-changes.ts'

const PATH = 'notes/essay.md'

/**
 * A mounted focus-mode editor for `PATH`, unregistered when the test ends.
 * Returns an edit: it replaces the text and reports the change, as the
 * editor's doc-change handler does.
 */
function mountEditor(initial: string): (markdown: string) => void {
  let markdown = initial
  const handle: NoteEditorHandle = {
    getMarkdown: () => markdown,
    setMarkdown: () => {},
    insertMarkdown: () => {},
    focus: () => {},
    setSelection: () => {},
    getSelectedText: () => '',
    openSelectionMenu: () => {},
    startPendingReplacement: () => false,
    appendPendingReplacementText: () => {},
    acceptPendingReplacement: () => {},
    discardPendingReplacement: () => {},
    findNext: () => {},
    findPrevious: () => {},
  }
  registerNoteEditorHandle(PATH, handle)
  reportNoteTextChange({ kind: 'mounted', path: PATH })
  onTestFinished(() => unregisterNoteEditorHandle(PATH, handle))
  return (next) => {
    markdown = next
    reportNoteTextChange({ kind: 'edited', path: PATH })
  }
}

async function renderStats() {
  return await renderInApp(
    <FocusedDailyProvider>
      <FocusModeStats />
    </FocusedDailyProvider>,
    { route: { kind: 'note', path: PATH } },
  )
}

describe('FocusModeStats', () => {
  it('shows nothing until the note has an editor on screen', async () => {
    await renderStats()
    await expect
      .element(page.getByRole('button', { name: 'Writing statistics' }))
      .not.toBeInTheDocument()

    await act(() => mountEditor('# Essay\n\nOne two three.'))
    await expect
      .element(page.getByRole('button', { name: 'Writing statistics' }))
      .toHaveTextContent('4 words')
  })

  it('recounts as the note is edited', async () => {
    const edit = mountEditor('Hello world.')
    await renderStats()
    const counter = page.getByRole('button', { name: 'Writing statistics' })
    await expect.element(counter).toHaveTextContent('2 words')

    await act(() => edit('Hello there, wide world.'))
    await expect.element(counter).toHaveTextContent('4 words')
    await act(() => reportNoteTextChange({ kind: 'edited', path: 'notes/other.md' }))
    await new Promise((resolve) => setTimeout(resolve, 300))
    await expect.element(counter).toHaveTextContent('4 words')
  })

  it('lists every statistic and remembers the one picked', async () => {
    mountEditor('+ [x] Done task\n+ [ ] Open task')
    const view = await renderStats()
    await page.getByRole('button', { name: 'Writing statistics' }).click()
    await page.getByRole('menuitemradio', { name: '1 of 2 tasks' }).click()

    await expect
      .element(page.getByRole('button', { name: 'Writing statistics' }))
      .toHaveTextContent('1 of 2 tasks')
    await vi.waitFor(() => expect(view.core.settings.get().focusModeStat).toBe('tasks'))
  })
})
