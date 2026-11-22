import { describe, expect, it } from 'vitest'
import { APP_COMMANDS } from '@reflect/app'

describe('view.toggleFocusMode', () => {
  it('keeps the V1 no-distraction shortcut', () => {
    expect(APP_COMMANDS['view.toggleFocusMode'].keybinding).toBe('Mod-Shift-f')
  })
})
