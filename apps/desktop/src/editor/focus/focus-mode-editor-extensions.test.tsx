import { createRef, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import '@/test-utils/locator.ts'
import { renderInApp } from '@/test-utils/render-in-app.tsx'
import { NoteEditor, type NoteEditorHandle } from '@/editor/note-editor.tsx'
import type { FocusDimMode } from './focus-dim.ts'
import { FocusModeEditorExtensions } from './focus-mode-editor-extensions.tsx'

const pmRoot = page.locate('.ProseMirror')

function texts(selector: string): string[] {
  return Array.from(document.querySelectorAll(selector), (element) => element.textContent)
}

function color(selector: string): string {
  const element = document.querySelector(selector)
  if (element === null) {
    throw new Error(`missing ${selector}`)
  }
  return getComputedStyle(element).color
}

function FocusEditor({
  markdown,
  dim,
  typewriter = false,
  handleRef,
  children,
}: {
  markdown: string
  dim: FocusDimMode | undefined
  typewriter?: boolean
  handleRef: React.Ref<NoteEditorHandle>
  children?: ReactNode
}): ReactNode {
  return (
    <NoteEditor initialContent={markdown} handleRef={handleRef}>
      <FocusModeEditorExtensions dim={dim} typewriter={typewriter} />
      {children}
    </NoteEditor>
  )
}

/** Render with the caret at the end of the note. */
async function renderAtEnd(markdown: string, dim: FocusDimMode | undefined) {
  const handleRef = createRef<NoteEditorHandle>()
  const view = await renderInApp(
    <FocusEditor markdown={markdown} dim={dim} handleRef={handleRef} />,
  )
  await expect.element(pmRoot).toBeInTheDocument()
  handleRef.current?.focus()
  handleRef.current?.setSelection('end')
  return { view, handleRef }
}

describe('focus dimming', () => {
  it('marks only the paragraph holding the caret in paragraph mode', async () => {
    await renderAtEnd('First paragraph.\n\nSecond one. More here.', 'paragraph')
    await expect.element(pmRoot).toHaveAttribute('data-focus-dim', 'paragraph')
    await expect.poll(() => texts('.reflect-focus-current')).toEqual(['Second one. More here.'])
    expect(texts('.reflect-focus-sentence, .reflect-focus-dim')).toEqual([])
  })

  it('marks the current sentence and dims the rest of its paragraph in sentence mode', async () => {
    await renderAtEnd('Other block.\n\nFirst one. Second one.', 'sentence')
    await expect.poll(() => texts('.reflect-focus-sentence').join('')).toBe('Second one.')
    expect(texts('.reflect-focus-dim').join('')).toBe('First one. ')

    await userEvent.keyboard('{ArrowLeft>13}')
    await expect.poll(() => texts('.reflect-focus-sentence').join('')).toBe('First one.')
  })

  it('paints dimmed text in a fainter color than the current sentence', async () => {
    await renderAtEnd('Other block.\n\nFirst one. Second one.', 'sentence')
    await expect.poll(() => texts('.reflect-focus-sentence').length).toBeGreaterThan(0)
    const current = color('.reflect-focus-sentence')
    expect(color('.reflect-focus-dim')).not.toBe(current)
    expect(color('.ProseMirror > p:first-child')).toBe(color('.reflect-focus-dim'))
  })

  it('keeps hidden syntax inside the sentence it belongs to', async () => {
    await renderAtEnd('Start here. Then **bold** words.', 'sentence')
    await expect.poll(() => texts('.reflect-focus-sentence').join('')).toContain('bold')
    expect(texts('.reflect-focus-dim').join('')).toBe('Start here. ')
  })

  it('leaves the editor undecorated without a dim mode', async () => {
    await renderAtEnd('One. Two.', undefined)
    await expect.element(pmRoot).not.toHaveAttribute('data-focus-dim')
    expect(texts('.reflect-focus-current')).toEqual([])
  })

  it('never changes the Markdown', async () => {
    const markdown = 'A **b** [[Link]] c.\n\nTwo. Three.\n'
    const { handleRef } = await renderAtEnd(markdown, 'sentence')
    await expect.poll(() => texts('.reflect-focus-sentence').length).toBeGreaterThan(0)
    expect(handleRef.current?.getMarkdown()).toBe(markdown)
  })
})

describe('typewriter scrolling', () => {
  const tallNote = Array.from({ length: 60 }, (_, index) => `Line ${index}.`).join('\n\n')

  async function renderScrolling(typewriter: boolean) {
    const handleRef = createRef<NoteEditorHandle>()
    await renderInApp(
      <div data-testid="scroller" style={{ height: 300, overflowY: 'auto' }}>
        <div style={{ paddingBlock: 150 }}>
          <FocusEditor
            markdown={tallNote}
            dim={undefined}
            typewriter={typewriter}
            handleRef={handleRef}
          />
        </div>
      </div>,
    )
    await expect.element(pmRoot).toBeInTheDocument()
    handleRef.current?.focus()
    const scroller = document.querySelector<HTMLElement>('[data-testid="scroller"]')
    if (scroller === null) {
      throw new Error('missing scroller')
    }
    return scroller
  }

  function caretOffsetFromCenter(scroller: HTMLElement): number {
    const selection = document.getSelection()
    if (selection === null || selection.rangeCount === 0) {
      throw new Error('no selection')
    }
    const caret = selection.getRangeAt(0).getBoundingClientRect()
    const box = scroller.getBoundingClientRect()
    return caret.top + caret.height / 2 - (box.top + box.height / 2)
  }

  it('centers the caret line while moving with the keyboard', async () => {
    const scroller = await renderScrolling(true)
    await userEvent.keyboard('{ArrowDown>20}')
    await expect.poll(() => Math.abs(caretOffsetFromCenter(scroller))).toBeLessThan(12)
  })

  it('centers the caret line while typing', async () => {
    const scroller = await renderScrolling(true)
    await userEvent.keyboard('{ArrowDown>20}')
    await userEvent.keyboard('{Enter}typed')
    await expect.poll(() => Math.abs(caretOffsetFromCenter(scroller))).toBeLessThan(12)
  })

  it('keeps the minimal scroll-into-view when off', async () => {
    const scroller = await renderScrolling(false)
    await userEvent.keyboard('{ArrowDown>20}')
    await expect.poll(() => scroller.scrollTop).toBeGreaterThan(0)
    expect(caretOffsetFromCenter(scroller)).toBeGreaterThan(50)
  })
})
