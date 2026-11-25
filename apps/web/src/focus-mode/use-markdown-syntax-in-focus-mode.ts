import type { EditorMarkdownSyntax } from '@reflect/core'
import { useFocusModeActive } from './focus-mode-provider.tsx'
import { useFocusModeMarkdownSyntax } from './use-focus-mode-settings.ts'

/**
 * The markdown syntax an editor shows: the editor's own setting, except while
 * focus mode is on and has its own (Settings, Focus mode, "Markdown syntax").
 * An override at read time rather than a write to the editor setting, so
 * leaving focus mode (or quitting during it) can never leave the editor
 * setting changed.
 */
export function useMarkdownSyntaxInFocusMode(
  editorSyntax: EditorMarkdownSyntax,
): EditorMarkdownSyntax {
  const active = useFocusModeActive()
  const focusSyntax = useFocusModeMarkdownSyntax()
  return active && focusSyntax !== 'editor' ? focusSyntax : editorSyntax
}
