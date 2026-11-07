import { describe, expect, it } from 'vitest'
import type { WritingStats } from '@reflect/core'
import { formatDuration, formatWritingStat } from './format-writing-stat.ts'

const STATS: WritingStats = {
  characters: 4874,
  charactersWithoutSpaces: 4053,
  words: 1,
  sentences: 97,
  readingSeconds: 241,
  speakingSeconds: 371,
  tasks: 3,
  tasksDone: 1,
}

describe('formatDuration', () => {
  it('shows minutes and seconds under an hour, hours above', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(241)).toBe('4:01')
    expect(formatDuration(3725)).toBe('1:02:05')
  })
})

describe('formatWritingStat', () => {
  it('labels each statistic', () => {
    expect(formatWritingStat('words', STATS)).toBe('1 word')
    expect(formatWritingStat('sentences', STATS)).toBe('97 sentences')
    expect(formatWritingStat('readingTime', STATS)).toBe('4:01 reading time')
    expect(formatWritingStat('speakingTime', STATS)).toBe('6:11 speaking time')
    expect(formatWritingStat('tasks', STATS)).toBe('1 of 3 tasks')
    expect(formatWritingStat('charactersWithoutSpaces', STATS)).toMatch(/^4.?053 without spaces$/u)
  })
})
