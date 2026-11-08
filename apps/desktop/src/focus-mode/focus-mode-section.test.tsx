import { page, userEvent } from 'vitest/browser'
import { describe, expect, it, vi } from 'vitest'
import { renderInApp } from '@/test-utils/render-in-app.tsx'
import '@/test-utils/locator.ts'
import { FocusModeSection } from './focus-mode-section.tsx'

describe('FocusModeSection', () => {
  it('saves the text size as steps from the default', async () => {
    const view = await renderInApp(<FocusModeSection />)
    const slider = page.getByRole('slider', { name: 'Focus mode text size' })
    await expect.element(slider).toHaveAttribute('aria-valuetext', 'Default')

    // The slider's input is visually hidden inside the thumb: focus it to drive it by key.
    const input = slider.element()
    if (!(input instanceof HTMLElement)) {
      throw new TypeError('missing slider input')
    }
    input.focus()
    await userEvent.keyboard('{Home}')
    await vi.waitFor(() => expect(view.core.settings.get().focusModeTextSize).toBe(-4))
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await vi.waitFor(() => expect(view.core.settings.get().focusModeTextSize).toBe(-2))
    await expect.element(slider).toHaveAttribute('aria-valuetext', '−2')
  })
})
