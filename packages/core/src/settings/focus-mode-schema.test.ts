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

  it('keeps typography settings in range and degrades the rest to iA-like defaults', () => {
    const parsed = settingsSchema.parse({
      focusModeTextSize: -2,
      focusModeLineWidth: 72,
      focusModeParagraphSpacing: 'half',
    })
    expect(parsed.focusModeTextSize).toBe(-2)
    expect(parsed.focusModeLineWidth).toBe(72)
    expect(parsed.focusModeParagraphSpacing).toBe('half')
    expect(settingsSchema.parse({ focusModeTextSize: 10 }).focusModeTextSize).toBe(0)
    expect(settingsSchema.parse({ focusModeTextSize: -5 }).focusModeTextSize).toBe(0)
    expect(settingsSchema.parse({ focusModeTextSize: 1.5 }).focusModeTextSize).toBe(0)
    expect(settingsSchema.parse({ focusModeLineWidth: '64' }).focusModeLineWidth).toBe(64)
    expect(
      settingsSchema.parse({ focusModeParagraphSpacing: 'double' }).focusModeParagraphSpacing,
    ).toBe('full')
  })
})
