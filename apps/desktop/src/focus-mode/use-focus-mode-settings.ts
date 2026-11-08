import type { Settings } from '@reflect/core'
import { isDeepEqual } from '@ocavue/utils'
import { useSelector } from '@/lib/use-store.ts'
import { useSettingsService } from '@/providers/settings-provider.tsx'

/*
 * React reads of focus mode's settings. They live here rather than in
 * `settings-provider.tsx` so the feature stays in its own folder. Selectors
 * are module-level: `useSelector` needs them stable.
 */

function selectDim(settings: Settings): Settings['focusModeDim'] {
  return settings.focusModeDim
}

function selectTypewriter(settings: Settings): Settings['focusModeTypewriter'] {
  return settings.focusModeTypewriter
}

function selectFullscreen(settings: Settings): Settings['focusModeFullscreen'] {
  return settings.focusModeFullscreen
}

function selectFont(settings: Settings): Settings['focusModeFont'] {
  return settings.focusModeFont
}

function selectStat(settings: Settings): Settings['focusModeStat'] {
  return settings.focusModeStat
}

function selectFontSize(settings: Settings): Settings['focusModeFontSize'] {
  return settings.focusModeFontSize
}

function selectLineWidth(settings: Settings): Settings['focusModeLineWidth'] {
  return settings.focusModeLineWidth
}

function selectParagraphSpacing(settings: Settings): Settings['focusModeParagraphSpacing'] {
  return settings.focusModeParagraphSpacing
}

/** What focus mode keeps at full strength: a sentence, a paragraph, or everything. */
export function useFocusModeDim(): Settings['focusModeDim'] {
  return useSelector(useSettingsService(), selectDim, isDeepEqual)
}

/** Whether focus mode keeps the caret line vertically centered. */
export function useFocusModeTypewriter(): Settings['focusModeTypewriter'] {
  return useSelector(useSettingsService(), selectTypewriter, isDeepEqual)
}

/** Whether entering focus mode also takes the window full screen. */
export function useFocusModeFullscreen(): Settings['focusModeFullscreen'] {
  return useSelector(useSettingsService(), selectFullscreen, isDeepEqual)
}

/** The installed font focus mode writes in; empty keeps the editor font. */
export function useFocusModeFont(): Settings['focusModeFont'] {
  return useSelector(useSettingsService(), selectFont, isDeepEqual)
}

/** The statistic the focus-mode counter shows. */
export function useFocusModeStat(): Settings['focusModeStat'] {
  return useSelector(useSettingsService(), selectStat, isDeepEqual)
}

/** Focus mode's text size, in CSS pixels. */
export function useFocusModeFontSize(): Settings['focusModeFontSize'] {
  return useSelector(useSettingsService(), selectFontSize, isDeepEqual)
}

/** Focus mode's column width, in monospace characters. */
export function useFocusModeLineWidth(): Settings['focusModeLineWidth'] {
  return useSelector(useSettingsService(), selectLineWidth, isDeepEqual)
}

/** The space focus mode leaves between paragraphs. */
export function useFocusModeParagraphSpacing(): Settings['focusModeParagraphSpacing'] {
  return useSelector(useSettingsService(), selectParagraphSpacing, isDeepEqual)
}
