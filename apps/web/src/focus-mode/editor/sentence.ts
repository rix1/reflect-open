/**
 * Sentence geometry for focus mode's sentence dimming: where sentences start
 * and end in a textblock's text, and which one a caret offset belongs to.
 * Pure string logic; `focus-dim.ts` projects the ProseMirror block to text.
 */

/**
 * A `[from, to)` range of UTF-16 offsets into a string.
 */
export interface TextRange {
  from: number
  to: number
}

/**
 * Stands in for a Markdown syntax character (`**`, `[`, `](url)`) when a
 * textblock is projected for sentence segmentation. U+2060 WORD JOINER has
 * `Sentence_Break=Format`, which UAX #29 makes transparent: the character
 * attaches to whatever precedes it, so hidden syntax never moves a sentence
 * boundary.
 */
export const SENTENCE_SYNTAX_PLACEHOLDER = '⁠'

/**
 * Stands in for an atom unit's characters (a wikilink, an image, a file pill,
 * inline math) and for an inline leaf node. U+FFFC OBJECT REPLACEMENT
 * CHARACTER has `Sentence_Break=Other`, so the unit reads like a word.
 */
export const SENTENCE_ATOM_PLACEHOLDER = '￼'

const SENTENCE_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'sentence' })

const WHITESPACE = /\s/

function isWhitespace(char: string | undefined): boolean {
  return char != null && WHITESPACE.test(char)
}

/**
 * The sentence boundaries of `text`: a sorted list starting at `0` and ending
 * at `text.length`, empty for an empty string. Uses `Intl.Segmenter`.
 *
 * A boundary that UAX #29 places after a run of syntax placeholders is moved
 * before the run when whitespace precedes it, so opening syntax (`**Bold**`)
 * starts the sentence it opens instead of trailing the previous one.
 */
export function getSentenceBoundaries(text: string): number[] {
  if (text.length === 0) {
    return []
  }
  const boundaries: number[] = [0]
  let previous = 0
  for (const { index } of SENTENCE_SEGMENTER.segment(text)) {
    if (index === 0) {
      continue
    }
    let boundary = index
    while (boundary > 0 && text[boundary - 1] === SENTENCE_SYNTAX_PLACEHOLDER) {
      boundary--
    }
    if (boundary === index || !(boundary === 0 || isWhitespace(text[boundary - 1]))) {
      boundary = index
    }
    if (boundary > previous) {
      boundaries.push(boundary)
      previous = boundary
    }
  }
  boundaries.push(text.length)
  return boundaries
}

// The end of `[from, to)` with trailing whitespace dropped.
function trimEnd(text: string, from: number, to: number): number {
  let end = to
  while (end > from && isWhitespace(text[end - 1])) {
    end--
  }
  return end
}

/**
 * Whether `sentence` is finished: typing a new sentence right after it, at the
 * caret, would start one. Asks the segmenter itself (with a capital letter as
 * the probe, since UAX #29 keeps "e.g. word" together), so "finished" follows
 * the same rules as the boundaries.
 */
function isFinishedSentence(sentence: string): boolean {
  const probe = `${sentence}A`
  let lastStart = 0
  for (const { index } of SENTENCE_SEGMENTER.segment(probe)) {
    lastStart = index
  }
  return lastStart === probe.length - 1
}

/**
 * The sentence the caret at `offset` belongs to, given the boundaries from
 * {@link getSentenceBoundaries}, with its trailing whitespace dropped.
 *
 * Once whitespace follows a finished sentence, the caret has moved on: a caret
 * in that whitespace belongs to the next sentence, or, at the end of the text,
 * to a new empty sentence (an empty range at `offset`). Whitespace after an
 * unfinished sentence (the space between two words as you type) keeps the
 * caret in it. Undefined for empty text.
 */
export function findSentenceAt(
  text: string,
  boundaries: readonly number[],
  offset: number,
): TextRange | undefined {
  // The sentences as [from, to) pairs of consecutive boundaries.
  const sentences = boundaries.slice(1).map((to, index) => ({ from: boundaries[index] ?? 0, to }))
  const lastIndex = sentences.length - 1
  if (lastIndex < 0) {
    return undefined
  }
  let index = sentences.findIndex((sentence) => sentence.to > offset)
  if (index === -1) {
    index = lastIndex
  }
  const sentence = sentences[index]
  const next = sentences[index + 1]
  if (sentence === undefined) {
    return undefined
  }
  const contentEnd = trimEnd(text, sentence.from, sentence.to)
  if (offset <= contentEnd) {
    return { from: sentence.from, to: contentEnd }
  }
  if (next !== undefined) {
    return { from: next.from, to: trimEnd(text, next.from, next.to) }
  }
  if (!isFinishedSentence(text.slice(sentence.from, offset))) {
    return { from: sentence.from, to: contentEnd }
  }
  return { from: offset, to: offset }
}

/**
 * The line (between literal newlines) containing `offset`, without its
 * newline. Code has no sentences, so code blocks focus by line.
 */
export function findLineAt(text: string, offset: number): TextRange {
  const from = offset === 0 ? 0 : text.lastIndexOf('\n', offset - 1) + 1
  const end = text.indexOf('\n', offset)
  return { from, to: end === -1 ? text.length : end }
}
