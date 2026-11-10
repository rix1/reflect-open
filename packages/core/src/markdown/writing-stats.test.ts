import { describe, expect, it } from 'vitest'
import { writingStats } from './writing-stats.ts'

describe('writingStats', () => {
  it('counts nothing in an empty body', () => {
    expect(writingStats('')).toEqual({
      characters: 0,
      charactersWithoutSpaces: 0,
      words: 0,
      sentences: 0,
      readingSeconds: 0,
      speakingSeconds: 0,
      tasks: 0,
      tasksDone: 0,
    })
  })

  it('counts the text a reader sees, not the Markdown syntax', () => {
    const stats = writingStats('# A title\n\nSome **bold** and [a link](https://example.com).')
    // "A title" + "\n" + "Some bold and a link."
    expect(stats.characters).toBe(7 + 1 + 21)
    expect(stats.charactersWithoutSpaces).toBe(6 + 17)
    expect(stats.words).toBe(2 + 5)
  })

  it('flattens wiki links and drops list and quote marks', () => {
    const stats = writingStats('- [[Some Note]] here\n> quoted words')
    expect(stats.words).toBe(5)
    expect(stats.characters).toBe('Some Note here'.length + 1 + 'quoted words'.length)
  })

  it('counts sentences, treating each heading or list item as its own', () => {
    const body = [
      '## Plans',
      '',
      'First sentence. Second one? Third!',
      '',
      '- an item without a period',
      '- another item',
    ].join('\n')
    expect(writingStats(body).sentences).toBe(1 + 3 + 2)
  })

  it('does not count lines without words as sentences', () => {
    expect(writingStats('---\n\n...\n\nOne.').sentences).toBe(1)
  })

  it('counts words in scripts without spaces', () => {
    expect(writingStats('日本語のテキスト').words).toBeGreaterThan(1)
  })

  it('estimates reading and speaking time from the word count', () => {
    const body = Array.from({ length: 400 }, () => 'word').join(' ')
    const stats = writingStats(body)
    expect(stats.words).toBe(400)
    expect(stats.readingSeconds).toBe(120)
    expect(stats.speakingSeconds).toBe(185)
  })

  it('counts tasks and the checked ones', () => {
    const body = '+ [ ] open task\n+ [x] done task\n+ [x] another done\n- plain bullet'
    const stats = writingStats(body)
    expect(stats.tasks).toBe(3)
    expect(stats.tasksDone).toBe(2)
  })
})
