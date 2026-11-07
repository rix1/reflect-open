import type { AppPlatform } from '@reflect/core'

/**
 * One user-facing change.
 */
export interface WhatsNewItem {
  readonly title: string
  readonly body: string
  readonly platforms: readonly AppPlatform[]
}

/**
 * User-facing changes keyed by marketing version. A beta appends to its
 * marketing version's list, so each beta update shows everything so far.
 */
export const WHATS_NEW: Readonly<Record<string, readonly WhatsNewItem[]>> = {
  '0.18.0': [
    {
      title: 'What’s New',
      body: 'After an update, Reflect now shows what changed. This is the first one.',
      platforms: ['desktop', 'ios'],
    },
    {
      title: 'Faster, smoother gestures',
      body: 'Swipes, sheets, and image dragging respond faster and move more smoothly.',
      platforms: ['ios'],
    },
    {
      title: 'New AI models',
      body: 'You can now choose GPT-6.1 Terra and Gemini Flash Lite Latest as your AI model.',
      platforms: ['desktop', 'ios'],
    },
    {
      title: 'Focus mode',
      body: 'Press ⌘⇧F to hide everything but the note, fade all but the sentence you are writing, and keep your line in the middle of the screen, with a live word count in the corner. Tune it in Settings → Focus mode.',
      platforms: ['desktop'],
    },
  ],
}
