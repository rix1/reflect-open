import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useRouterState } from '@/routing/router.tsx'
import { useAppServices, useCoreServices } from '@/services/services-provider.tsx'
import { fontHasHeavyFace } from './font-heavy-face.ts'
import { FocusModeStats } from './focus-mode-stats.tsx'
import {
  useFocusModeFont,
  useFocusModeTextSize,
  useFocusModeFullscreen,
  useFocusModeLineWidth,
  useFocusModeParagraphSpacing,
  useFocusModeTypewriter,
} from './use-focus-mode-settings.ts'
import './focus-mode.css'

/**
 * Focus mode (⌘⇧F): a writing surface with nothing but the note. Provided
 * once per main window, around `WorkspaceContent`, so the shell (which hides
 * its sidebars), the note editors (which dim) and the command registry share
 * one source of truth. Session-only, like the sidebar: a relaunch starts with
 * the normal layout.
 *
 * A session belongs to the place it was started in: any navigation (another
 * note, settings, ⌘D, back/forward) ends it. Renaming the note does not, since
 * the router rewrites the route in place without a new arrival.
 *
 * Everything else it changes is CSS keyed off the root attributes set here
 * (`focus-mode.css`). Outside a provider (note windows, tests that render a
 * lone pane) focus mode is simply off.
 */

interface FocusModeContextValue {
  active: boolean
  toggleFocusMode: () => void
}

const FOCUS_MODE_OFF: FocusModeContextValue = { active: false, toggleFocusMode: () => {} }

const FocusModeContext = createContext<FocusModeContextValue>(FOCUS_MODE_OFF)

export function FocusModeProvider({ children }: { children: ReactNode }): ReactElement {
  const [active, setActive] = useState(false)
  const toggleFocusMode = useCallback(() => {
    setActive((current) => !current)
  }, [])

  // Leave on navigation. Adjusted during render rather than in an effect, so
  // the screen navigated to never paints in focus mode. `entryId` moves on
  // back/forward, `arrivalSeq` on every navigate (even to the same route).
  const { entryId, arrivalSeq } = useRouterState()
  const location = `${entryId}:${arrivalSeq}`
  const [seenLocation, setSeenLocation] = useState(location)
  if (location !== seenLocation) {
    setSeenLocation(location)
    setActive(false)
  }

  const value = useMemo<FocusModeContextValue>(
    () => ({ active, toggleFocusMode }),
    [active, toggleFocusMode],
  )
  return (
    <FocusModeContext value={value}>
      <FocusModeFullscreen active={active} />
      <FocusModeRootAttributes active={active} />
      {children}
      {active ? <FocusModeStats /> : null}
    </FocusModeContext>
  )
}

/**
 * Takes the window full screen on entering focus mode (when the setting asks
 * for it) and back out on leaving. Leaving only undoes the full screen focus
 * mode itself entered: a window that was already full screen stays that way.
 */
function FocusModeFullscreen({ active }: { active: boolean }): null {
  const fullscreenOnEnter = useFocusModeFullscreen()
  const { window: appWindow } = useAppServices()
  const { logger } = useCoreServices()
  const enteredFullscreenRef = useRef(false)

  const sync = useEffectEvent(async (entering: boolean): Promise<void> => {
    try {
      if (entering) {
        if (!fullscreenOnEnter || (await appWindow.isFullscreen())) {
          return
        }
        await appWindow.setFullscreen(true)
        enteredFullscreenRef.current = true
      } else if (enteredFullscreenRef.current) {
        enteredFullscreenRef.current = false
        await appWindow.setFullscreen(false)
      }
    } catch (cause) {
      logger.warn('focus mode full screen failed:', cause)
    }
  })

  useEffect(() => {
    void sync(active)
  }, [active])

  return null
}

/**
 * Mirrors focus mode onto the document root so CSS (`focus-mode.css`) can
 * restyle every surface at once: `data-focus-mode`, the typewriter padding
 * hook `data-focus-typewriter`, `data-focus-paragraph-spacing`, and the
 * typography variables `--focus-mode-font`, `--focus-mode-text-scale` and
 * `--focus-mode-line-width`, and `data-focus-faux-bold` when the focus font
 * has no bold face of its own.
 */
function FocusModeRootAttributes({ active }: { active: boolean }): null {
  const font = useFocusModeFont()
  const textSize = useFocusModeTextSize()
  const lineWidth = useFocusModeLineWidth()
  const paragraphSpacing = useFocusModeParagraphSpacing()
  const typewriter = useFocusModeTypewriter()

  useEffect(() => {
    if (!active) {
      return
    }
    const root = document.documentElement
    root.dataset['focusMode'] = 'true'
    root.dataset['focusParagraphSpacing'] = paragraphSpacing
    // Each step is a seventeenth of the base size: about 1px at the middle size.
    root.style.setProperty('--focus-mode-text-scale', String((17 + textSize) / 17))
    root.style.setProperty('--focus-mode-line-width', String(lineWidth))
    if (typewriter) {
      root.dataset['focusTypewriter'] = 'true'
    }
    if (font !== '') {
      root.style.setProperty('--focus-mode-font', `"${font}"`)
    }
    return () => {
      delete root.dataset['focusMode']
      delete root.dataset['focusTypewriter']
      delete root.dataset['focusParagraphSpacing']
      root.style.removeProperty('--focus-mode-font')
      root.style.removeProperty('--focus-mode-text-scale')
      root.style.removeProperty('--focus-mode-line-width')
    }
  }, [active, font, textSize, lineWidth, paragraphSpacing, typewriter])

  // `data-focus-faux-bold`: the focus font has no heavy face for headings.
  useEffect(() => {
    if (!active || font === '') {
      return
    }
    const root = document.documentElement
    let current = true
    void fontHasHeavyFace(font).then((hasHeavyFace) => {
      if (current && !hasHeavyFace) {
        root.dataset['focusFauxBold'] = 'true'
      }
    })
    return () => {
      current = false
      delete root.dataset['focusFauxBold']
    }
  }, [active, font])

  return null
}

/** Focus mode state + the toggle; off, with a no-op toggle, outside a provider. */
export function useFocusMode(): FocusModeContextValue {
  return use(FocusModeContext)
}

/** Whether focus mode is on (`false` outside a provider). */
export function useFocusModeActive(): boolean {
  return use(FocusModeContext).active
}
