import { useEffect, useState } from 'react'
import { writingStats, type WritingStats } from '@reflect/core'
import { noteEditorHandleFor } from '@/editor/editor-handle-registry.ts'
import { subscribeNoteTextChanges } from './note-text-changes.ts'

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
    // The mounted editor is read on a timer, never inside its own
    // transaction, and at most once per interval while the user types.
    const recount = (): void => {
      timer = undefined
      const markdown = noteEditorHandleFor(path)?.getMarkdown()
      if (markdown !== undefined) {
        setCounted({ path, stats: writingStats(markdown) })
      }
    }
    const schedule = (delay: number): void => {
      // No `??=`: React Compiler rejects logical assignment in production builds.
      if (timer === undefined) {
        timer = setTimeout(recount, delay)
      }
    }

    schedule(0)
    const unsubscribe = subscribeNoteTextChanges((change) => {
      if (change.path === path) {
        schedule(change.kind === 'mounted' ? 0 : RECOUNT_INTERVAL_MS)
      }
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [path])

  return counted !== null && counted.path === path ? counted.stats : null
}
