import { describe, expect, it } from 'vitest'
import { stepScroll } from './smooth-scroll.ts'

describe('stepScroll', () => {
  it('covers most of the distance quickly, then settles on the target', () => {
    const afterOneFrame = stepScroll(0, 100, 16)
    expect(afterOneFrame).toBeGreaterThan(15)
    expect(afterOneFrame).toBeLessThan(30)
    expect(stepScroll(0, 100, 210)).toBeGreaterThan(94)
    expect(stepScroll(0, 100, 600)).toBe(100)
  })

  it('moves the same way scrolling up', () => {
    expect(stepScroll(100, 0, 16)).toBeCloseTo(100 - stepScroll(0, 100, 16), 6)
  })

  it('lands exactly once within half a pixel', () => {
    expect(stepScroll(99.7, 100, 1)).toBe(100)
  })

  it('stays put when no time has passed', () => {
    expect(stepScroll(10, 100, 0)).toBe(10)
    expect(stepScroll(10, 100, -5)).toBe(10)
  })
})
