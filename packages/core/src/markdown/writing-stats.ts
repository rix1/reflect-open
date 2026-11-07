import { plainTextLines } from './plain-text-lines.ts'
import { projectTasks } from './task-ast.ts'

/**
 * Writing statistics (focus mode's counter): what a writer wants to know
 * about the text they see, not its Markdown source. Counts run over the
 * body's plain text (`plainTextLines`), so syntax marks, URLs and frontmatter
 * never count, and use `Intl.Segmenter`, so words and sentences follow the
 * runtime's Unicode rules (CJK text included) instead of splitting on spaces.
 */

// The rates iA Writer's counter uses: silent reading at 200 words a minute,
// reading aloud at 130.
const READING_WORDS_PER_MINUTE = 200
const SPEAKING_WORDS_PER_MINUTE = 130

const WORD_CHARACTER_RE = /[\p{L}\p{N}]/u
const WHITESPACE_RE = /^\s+$/u

/** Counts for one note body. */
export interface WritingStats {
  /** Characters a reader sees (grapheme clusters), spaces and line breaks included. */
  readonly characters: number
  /** {@link characters} minus whitespace. */
  readonly charactersWithoutSpaces: number
  readonly words: number
  /** Sentences; a heading or list item without end punctuation counts as one. */
  readonly sentences: number
  /** Estimated silent reading time, in whole seconds. */
  readonly readingSeconds: number
  /** Estimated time to read the text aloud, in whole seconds. */
  readonly speakingSeconds: number
  /** Reflect tasks in the body (the items the Tasks view lists). */
  readonly tasks: number
  /** Checked task items. */
  readonly tasksDone: number
}

// The runtime locale's Unicode segmentation rules.
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const WORDS = new Intl.Segmenter(undefined, { granularity: 'word' })
const SENTENCES = new Intl.Segmenter(undefined, { granularity: 'sentence' })

function secondsAt(wordCount: number, wordsPerMinute: number): number {
  return Math.round((wordCount / wordsPerMinute) * 60)
}

/** Count the plain text of a note body (Markdown without frontmatter). */
export function writingStats(body: string): WritingStats {
  const lines = plainTextLines(body)
  let characters = Math.max(0, lines.length - 1) // the line breaks between lines
  let charactersWithoutSpaces = 0
  let wordCount = 0
  let sentenceCount = 0

  for (const line of lines) {
    for (const { segment } of GRAPHEMES.segment(line)) {
      characters++
      if (!WHITESPACE_RE.test(segment)) {
        charactersWithoutSpaces++
      }
    }
    for (const { isWordLike } of WORDS.segment(line)) {
      if (isWordLike === true) {
        wordCount++
      }
    }
    for (const { segment } of SENTENCES.segment(line)) {
      if (WORD_CHARACTER_RE.test(segment)) {
        sentenceCount++
      }
    }
  }

  const tasks = projectTasks(body)
  return {
    characters,
    charactersWithoutSpaces,
    words: wordCount,
    sentences: sentenceCount,
    readingSeconds: secondsAt(wordCount, READING_WORDS_PER_MINUTE),
    speakingSeconds: secondsAt(wordCount, SPEAKING_WORDS_PER_MINUTE),
    tasks: tasks.length,
    tasksDone: tasks.filter((task) => task.checked).length,
  }
}
