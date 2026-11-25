/**
 * Typewriter scrolling's motion: an eased scroll that chases a moving target.
 * Each request re-aims the running animation instead of queueing another one,
 * so fast typing never makes the page trail behind the caret. The motion is
 * exponential (it covers most of the distance at once, then settles), the
 * feel of iA Writer's typewriter. Scrolling by hand mid-animation hands
 * control back to the user, and "Reduce motion" makes every scroll instant.
 */

// Time constant of the exponential approach: about 95% of the way after three
// of these, so a line-height step settles in roughly 200ms.
const TIME_CONSTANT_MS = 70

// Close enough to the target to land on it.
const SETTLE_DISTANCE_PX = 0.5

// A scroll position further than this from the one the animation last wrote
// was moved by something else (the user, a virtualizer's re-anchoring).
const FOREIGN_SCROLL_PX = 2

interface ScrollAnimation {
  target: number
  position: number
  lastTime: number
}

const animations = new WeakMap<Element, ScrollAnimation>()

/**
 * Where an exponential approach from `position` toward `target` is after
 * `elapsedMs`. Exported for tests.
 */
export function stepScroll(position: number, target: number, elapsedMs: number): number {
  const remaining = (target - position) * Math.exp(-Math.max(0, elapsedMs) / TIME_CONSTANT_MS)
  return Math.abs(remaining) < SETTLE_DISTANCE_PX ? target : target - remaining
}

function prefersReducedMotion(view: Window | null): boolean {
  return view?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Scroll `scroller` by `delta` pixels, smoothly unless reduced motion is on.
 * A call during a running animation retargets it: `delta` is measured from
 * where the page is now, so the new target is `scrollTop + delta`.
 */
export function smoothScrollBy(scroller: Element, delta: number): void {
  const view = scroller.ownerDocument.defaultView
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  const target = Math.min(maxScroll, Math.max(0, scroller.scrollTop + delta))

  if (view === null || prefersReducedMotion(view)) {
    animations.delete(scroller)
    scroller.scrollTop = target
    return
  }

  const running = animations.get(scroller)
  if (running !== undefined) {
    running.target = target
    return
  }

  const animation: ScrollAnimation = {
    target,
    position: scroller.scrollTop,
    lastTime: view.performance.now(),
  }
  animations.set(scroller, animation)

  const frame = (now: number): void => {
    if (animations.get(scroller) !== animation) {
      return
    }
    if (Math.abs(scroller.scrollTop - animation.position) > FOREIGN_SCROLL_PX) {
      animations.delete(scroller)
      return
    }
    animation.position = stepScroll(animation.position, animation.target, now - animation.lastTime)
    animation.lastTime = now
    scroller.scrollTop = animation.position
    if (animation.position === animation.target) {
      animations.delete(scroller)
      return
    }
    view.requestAnimationFrame(frame)
  }
  view.requestAnimationFrame(frame)
}
