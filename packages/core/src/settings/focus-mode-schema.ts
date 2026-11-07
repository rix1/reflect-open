import { z } from 'zod'

/**
 * Focus mode's persisted settings (⌘⇧F). Kept out of `schema.ts`, which
 * spreads {@link focusModeSettingsShape} into `settingsSchema`, so the feature
 * stays one self-contained file.
 */

/**
 * What focus mode (⌘⇧F) dims while you write: everything but the current
 * sentence, everything but the current paragraph, or nothing. Display-only.
 */
export const focusModeDimSchema = z.enum(['sentence', 'paragraph', 'off']).catch('sentence')

export type FocusModeDim = z.infer<typeof focusModeDimSchema>

/**
 * Whether focus mode keeps the line you are typing on vertically centered
 * (typewriter scrolling). On by default.
 */
export const focusModeTypewriterSchema = z.boolean().catch(true)

/** Whether entering focus mode also takes the window full screen. Off by default. */
export const focusModeFullscreenSchema = z.boolean().catch(false)

/**
 * The font family focus mode writes in: the name of a font the user has
 * installed (for example "IBM Plex Mono"). Empty keeps the editor font.
 * Reduced to letters, digits, spaces, `.`, `_` and `-` so a hand-edited
 * settings file can't inject CSS through the font name.
 */
export const focusModeFontSchema = z
  .string()
  .transform((value) => {
    return value
      .replaceAll(/[^\p{L}\p{N} ._-]/gu, '')
      .replaceAll(/ {2,}/g, ' ')
      .trim()
      .slice(0, 80)
  })
  .catch('')

/**
 * The writing statistic focus mode's corner counter shows; its menu lists
 * them all and checks this one. Words by default.
 */
export const focusModeStatSchema = z
  .enum([
    'characters',
    'charactersWithoutSpaces',
    'words',
    'sentences',
    'readingTime',
    'speakingTime',
    'tasks',
  ])
  .catch('words')

export type FocusModeStat = z.infer<typeof focusModeStatSchema>

/** The focus-mode keys of `settingsSchema`. */
export const focusModeSettingsShape = {
  focusModeDim: focusModeDimSchema,
  focusModeTypewriter: focusModeTypewriterSchema,
  focusModeFullscreen: focusModeFullscreenSchema,
  focusModeFont: focusModeFontSchema,
  focusModeStat: focusModeStatSchema,
}
