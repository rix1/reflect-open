import { describe, expect, it } from 'vitest'

import {
  findLineAt,
  findSentenceAt,
  getSentenceBoundaries,
  SENTENCE_SYNTAX_PLACEHOLDER as S,
} from './sentence.ts'

/**
 * The current sentence for a caret at the `|` in `marked`, as text.
 */
function sentenceAt(marked: string): string | undefined {
  const offset = marked.indexOf('|')
  const text = marked.slice(0, offset) + marked.slice(offset + 1)
  const range = findSentenceAt(text, getSentenceBoundaries(text), offset)
  return range && text.slice(range.from, range.to)
}

describe('getSentenceBoundaries', () => {
  it('is empty for empty text', () => {
    expect(getSentenceBoundaries('')).toEqual([])
  })

  it('splits after terminal punctuation and the whitespace that follows', () => {
    expect(getSentenceBoundaries('One. Two? Three!')).toEqual([0, 5, 10, 16])
  })

  it('keeps transparent syntax at the end of the sentence it closes', () => {
    const text = `${S}${S}Bold.${S}${S} Next.`
    expect(getSentenceBoundaries(text)).toEqual([0, 10, 15])
  })

  it('moves opening syntax after whitespace into the sentence it opens', () => {
    const text = `One. ${S}${S}Two${S}${S} three.`
    expect(getSentenceBoundaries(text)).toEqual([0, 5, text.length])
  })
})

describe('findSentenceAt', () => {
  it.each([
    ['|One. Two. Three.', 'One.'],
    ['On|e. Two. Three.', 'One.'],
    ['One.| Two. Three.', 'One.'],
    ['One. |Two. Three.', 'Two.'],
    ['One. Two.| Three.', 'Two.'],
    ['One. Two. Three.|', 'Three.'],
    ['One. Two. Thr|ee', 'Three'],
  ])('%j -> %j', (marked, expected) => {
    expect(sentenceAt(marked)).toBe(expected)
  })

  it('is undefined for empty text', () => {
    expect(sentenceAt('|')).toBeUndefined()
  })

  it('starts a new, empty sentence after the trailing whitespace at the end', () => {
    expect(sentenceAt('Done. |')).toBe('')
    expect(sentenceAt('Done.  |')).toBe('')
  })

  it('stays in an unfinished sentence when the caret follows a space', () => {
    expect(sentenceAt('Spadce is |')).toBe('Spadce is')
    expect(sentenceAt('Done. Spadce is muting |')).toBe('Spadce is muting')
    expect(sentenceAt('I wrote it, |')).toBe('I wrote it,')
  })

  it('moves on after a sentence ending in a closing quote or bracket', () => {
    expect(sentenceAt('He said “stop.” |')).toBe('')
    expect(sentenceAt('(It was late.) |')).toBe('')
  })

  it('moves on to the next sentence from inside the whitespace between two', () => {
    expect(sentenceAt('One. | Two.')).toBe('Two.')
  })

  it('splits at question and exclamation marks', () => {
    expect(sentenceAt('Really? Ye|s! Fine.')).toBe('Yes!')
  })

  it('splits at a soft line break', () => {
    expect(sentenceAt('A line without a period\nAnother| line')).toBe('Another line')
    expect(sentenceAt('First line\n|')).toBe('')
  })

  it('does not split inside a decimal number', () => {
    expect(sentenceAt('It costs 3.50 kr. Che|ap.')).toBe('Cheap.')
    expect(sentenceAt('It costs 3.5|0 kr. Cheap.')).toBe('It costs 3.50 kr.')
  })

  it('keeps an abbreviation followed by a lowercase word in one sentence', () => {
    expect(sentenceAt('Use a tool, e.g. a fo|rk. Done.')).toBe('Use a tool, e.g. a fork.')
  })

  it('handles Norwegian text', () => {
    expect(sentenceAt('Hei på deg. Hvordan g|år det? Bra, takk!')).toBe('Hvordan går det?')
    expect(sentenceAt('Det er kaldt. Ærlig talt er det for k|aldt.')).toBe(
      'Ærlig talt er det for kaldt.',
    )
    expect(sentenceAt('Vi så på blåbær|. Øl etterpå.')).toBe('Vi så på blåbær.')
  })

  it('treats hidden syntax as transparent', () => {
    expect(sentenceAt(`Start. ${S}${S}Bo|ld.${S}${S} End.`)).toBe(`${S}${S}Bold.${S}${S}`)
    expect(sentenceAt(`Start. ${S}${S}Bold.${S}${S} E|nd.`)).toBe('End.')
  })
})

describe('findLineAt', () => {
  it.each([
    ['|', [0, 0]],
    ['|abc', [0, 3]],
    ['abc|', [0, 3]],
    ['abc\n|def', [4, 7]],
    ['abc|\ndef', [0, 3]],
    ['\n|\n', [1, 1]],
  ])('%j -> %j', (marked, [from, to]) => {
    const offset = marked.indexOf('|')
    const text = marked.slice(0, offset) + marked.slice(offset + 1)
    expect(findLineAt(text, offset)).toEqual({ from, to })
  })
})
