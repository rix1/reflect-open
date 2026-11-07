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
import {
  useFocusModeFont,
  useFocusModeFullscreen,
  useFocusModeTypewriter,
} from '@/providers/settings-provider.tsx'
import { useAppServices, useCoreServices } from '@/services/services-provider.tsx'

/**
 * Focus mode (⌘⇧F): a writing surface with nothing but the note. Provided
 * once per workspace so the shell (which hides its sidebars), the note panes
 * (which hide their backlinks and dim) and the command registry share one
 * source of truth. Session-only, like the sidebar: a relaunch starts with
 * the normal layout.
 */

interface FocusModeContextValue {
  active: boolean
  toggleFocusMode: () => void
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null)

export function FocusModeProvider({ children }: { children: ReactNode }): ReactElement {
  const [active, setActive] = useState(false)
  const toggleFocusMode = useCallback(() => {
    setActive((current) => !current)
  }, [])

  const value = useMemo<FocusModeContextValue>(
    () => ({ active, toggleFocusMode }),
    [active, toggleFocusMode],
  )
  return (
    <FocusModeContext value={value}>
      <FocusModeFullscreen active={active} />
      <FocusModeRootAttributes active={active} />
      {children}
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
 * Mirrors focus mode onto the document root (`data-focus-mode`, the
 * typewriter padding hook `data-focus-typewriter`, and the `--focus-mode-font`
 * the writing surface uses) so CSS can restyle every surface at once.
 */
function FocusModeRootAttributes({ active }: { active: boolean }): null {
  const font = useFocusModeFont()
  const typewriter = useFocusModeTypewriter()

  useEffect(() => {
    if (!active) {
      return
    }
    const root = document.documentElement
    root.dataset['focusMode'] = 'true'
    if (typewriter) {
      root.dataset['focusTypewriter'] = 'true'
    }
    if (font !== '') {
      root.style.setProperty('--focus-mode-font', `"${font}"`)
    }
    return () => {
      delete root.dataset['focusMode']
      delete root.dataset['focusTypewriter']
      root.style.removeProperty('--focus-mode-font')
    }
  }, [active, font, typewriter])

  return null
}

/** Focus mode state + the toggle. Use within a FocusModeProvider. */
export function useFocusMode(): FocusModeContextValue {
  const context = use(FocusModeContext)
  if (!context) {
    throw new Error('useFocusMode must be used within a FocusModeProvider')
  }
  return context
}

/**
 * Whether focus mode is on, or `false` outside a workspace (settings
 * previews, tests that render a lone pane).
 */
export function useFocusModeActive(): boolean {
  return use(FocusModeContext)?.active ?? false
}
