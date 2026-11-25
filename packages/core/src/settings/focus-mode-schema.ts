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

/**
 * Focus mode's text size, as steps from the default. Like iA Writer, the
 * base size follows the window width (15, 17 or 19px across three
 * breakpoints, `focus-mode.css`) and each step scales all three by a
 * seventeenth, about 1px at the middle size. -4 to +9, iA's slider range.
 */
export const FOCUS_MODE_TEXT_SIZE_RANGE = { min: -4, max: 9 } as const

export const focusModeTextSizeSchema = z
  .number()
  .int()
  .min(FOCUS_MODE_TEXT_SIZE_RANGE.min)
  .max(FOCUS_MODE_TEXT_SIZE_RANGE.max)
  .catch(0)

/**
 * How wide focus mode's column is, in characters of a monospace font at the
 * focus-mode size. 64 by default, iA Writer's line length.
 */
export const focusModeLineWidthSchema = z.number().int().min(40).max(100).catch(64)

/**
 * The space between paragraphs (and headings, quotes and lists, but not
 * between the items of one list) in focus mode: a full blank line like iA
 * Writer, half of one, or the editor's usual tight spacing.
 */
export const focusModeParagraphSpacingSchema = z.enum(['full', 'half', 'tight']).catch('full')

export type FocusModeParagraphSpacing = z.infer<typeof focusModeParagraphSpacingSchema>

/**
 * How focus mode shows markdown syntax, overriding the editor's own setting
 * while it is on: always (like iA Writer), around the caret, never, or the
 * same as the editor. The editor's setting itself is never changed, so
 * leaving focus mode brings it straight back.
 */
export const focusModeMarkdownSyntaxSchema = z
  .enum(['show', 'hybrid', 'hide', 'editor'])
  .catch('show')

export type FocusModeMarkdownSyntax = z.infer<typeof focusModeMarkdownSyntaxSchema>

/** The focus-mode keys of `settingsSchema`. */
export const focusModeSettingsShape = {
  focusModeDim: focusModeDimSchema,
  focusModeTypewriter: focusModeTypewriterSchema,
  focusModeFullscreen: focusModeFullscreenSchema,
  focusModeFont: focusModeFontSchema,
  focusModeStat: focusModeStatSchema,
  focusModeTextSize: focusModeTextSizeSchema,
  focusModeLineWidth: focusModeLineWidthSchema,
  focusModeParagraphSpacing: focusModeParagraphSpacingSchema,
  focusModeMarkdownSyntax: focusModeMarkdownSyntaxSchema,
}
