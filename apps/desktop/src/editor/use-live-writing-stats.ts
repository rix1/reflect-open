import { useEffect, useState } from 'react'
import { writingStats, type WritingStats } from '@reflect/core'
import { noteEditorHandleFor, subscribeNoteEditors } from '@/editor/editor-handle-registry.ts'

// Recount at most this often while the user types: often enough to read as
// live, rarely enough that a long note's re-parse never competes with typing.
const RECOUNT_INTERVAL_MS = 250

interface CountedStats {
  path: string
  stats: WritingStats
}

/**
 * Live writing statistics for the note at `path`, recounted as its mounted
 * editor changes. Null when there is no note, or its editor is not on screen
 * (still loading, protected, virtualized away).
 */
export function useLiveWritingStats(path: string | null): WritingStats | null {
  const [counted, setCounted] = useState<CountedStats | null>(null)

  useEffect(() => {
    if (path === null) {
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    // The text to count next: an edit's Markdown, or a read of the mounted
    // editor, deferred so it never runs inside the editor's own commit.
    let pending: (() => string | null) | undefined

    const recount = (): void => {
      timer = undefined
      const markdown = pending?.()
      pending = undefined
      if (markdown != null) {
        setCounted({ path, stats: writingStats(markdown) })
      }
    }
    const schedule = (read: () => string | null, delay: number): void => {
      pending = read
      timer ??= setTimeout(recount, delay)
    }
    const readEditor = (): string | null => noteEditorHandleFor(path)?.getMarkdown() ?? null

    schedule(readEditor, 0)
    const unsubscribe = subscribeNoteEditors((event) => {
      if (event.path !== path) {
        return
      }
      if (event.kind === 'mounted') {
        schedule(readEditor, 0)
      } else {
        const { markdown } = event
        schedule(() => markdown, RECOUNT_INTERVAL_MS)
      }
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [path])

  return counted !== null && counted.path === path ? counted.stats : null
}
