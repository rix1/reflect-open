import type { FocusModeStat, WritingStats } from '@reflect/core'

/** Every statistic the focus-mode counter offers, in menu order. */
export const FOCUS_MODE_STATS: readonly FocusModeStat[] = [
  'characters',
  'charactersWithoutSpaces',
  'words',
  'sentences',
  'readingTime',
  'speakingTime',
  'tasks',
]

const numberFormat = new Intl.NumberFormat()

function count(value: number, singular: string, plural: string): string {
  return `${numberFormat.format(value)} ${value === 1 ? singular : plural}`
}

/** `m:ss`, or `h:mm:ss` from an hour up. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`
}

/** One statistic as the counter shows it: "804 words", "4:01 reading time". */
export function formatWritingStat(stat: FocusModeStat, stats: WritingStats): string {
  switch (stat) {
    case 'characters':
      return count(stats.characters, 'character', 'characters')
    case 'charactersWithoutSpaces':
      return `${numberFormat.format(stats.charactersWithoutSpaces)} without spaces`
    case 'words':
      return count(stats.words, 'word', 'words')
    case 'sentences':
      return count(stats.sentences, 'sentence', 'sentences')
    case 'readingTime':
      return `${formatDuration(stats.readingSeconds)} reading time`
    case 'speakingTime':
      return `${formatDuration(stats.speakingSeconds)} speaking time`
    case 'tasks':
      return `${numberFormat.format(stats.tasksDone)} of ${count(stats.tasks, 'task', 'tasks')}`
  }
}
