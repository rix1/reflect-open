import type { ReactElement } from 'react'
import { focusModeStatSchema } from '@reflect/core'
import { focusedNotePathForRoute } from '@reflect/app'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { useLiveWritingStats } from '@/editor/use-live-writing-stats.ts'
import { useToday } from '@/lib/use-today.ts'
import { useFocusedDailyDate } from '@/providers/focused-daily-provider.tsx'
import { useFocusModeStat, useSettingsService } from '@/providers/settings-provider.tsx'
import { useRouterState } from '@/routing/router.tsx'
import { FOCUS_MODE_STATS, formatWritingStat } from './format-writing-stat.ts'

/**
 * Focus mode's writing counter, in the window's bottom-right corner: one
 * statistic of the note being written ("804 words"), and a menu of all of
 * them that picks which one shows. Counts the same note note-scoped commands
 * target (the focused day in the daily stream).
 */
export function FocusModeStats(): ReactElement | null {
  const { route } = useRouterState()
  const today = useToday()
  const focusedDailyDate = useFocusedDailyDate()
  const stats = useLiveWritingStats(focusedNotePathForRoute(route, today, focusedDailyDate))
  const selected = useFocusModeStat()
  const settingsService = useSettingsService()

  if (stats === null) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-3 z-10">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Writing statistics"
              className="text-text-muted tabular-nums"
            >
              {formatWritingStat(selected, stats)}
              <ChevronsUpDown data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent side="top" align="end" sideOffset={6}>
          <DropdownMenuRadioGroup
            value={selected}
            onValueChange={(value) => {
              settingsService.update({ focusModeStat: focusModeStatSchema.parse(value) })
            }}
          >
            {FOCUS_MODE_STATS.map((stat) => (
              <DropdownMenuRadioItem key={stat} value={stat} className="tabular-nums">
                {formatWritingStat(stat, stats)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
