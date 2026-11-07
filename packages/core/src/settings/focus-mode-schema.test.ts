import { describe, expect, it } from 'vitest'
import { settingsSchema } from './schema.ts'

describe('focus-mode settings', () => {
  it('keeps focus-mode settings and degrades invalid ones to their defaults', () => {
    const parsed = settingsSchema.parse({
      focusModeDim: 'paragraph',
      focusModeTypewriter: false,
      focusModeFullscreen: true,
      focusModeFont: 'IBM Plex Mono',
      focusModeStat: 'readingTime',
    })
    expect(parsed.focusModeDim).toBe('paragraph')
    expect(parsed.focusModeTypewriter).toBe(false)
    expect(parsed.focusModeFullscreen).toBe(true)
    expect(parsed.focusModeFont).toBe('IBM Plex Mono')
    expect(parsed.focusModeStat).toBe('readingTime')
    expect(settingsSchema.parse({ focusModeStat: 'pages' }).focusModeStat).toBe('words')
    expect(settingsSchema.parse({ focusModeDim: 'word' }).focusModeDim).toBe('sentence')
    expect(settingsSchema.parse({ focusModeTypewriter: 'yes' }).focusModeTypewriter).toBe(true)
    expect(settingsSchema.parse({ focusModeFont: 7 }).focusModeFont).toBe('')
  })

  it('reduces the focus-mode font to a plain family name', () => {
    expect(settingsSchema.parse({ focusModeFont: '  Iosevka  ' }).focusModeFont).toBe('Iosevka')
    expect(
      settingsSchema.parse({ focusModeFont: 'Evil"; } body { display: none' }).focusModeFont,
    ).toBe('Evil body display none')
    expect(settingsSchema.parse({ focusModeFont: 'x'.repeat(200) }).focusModeFont).toHaveLength(80)
  })
})
