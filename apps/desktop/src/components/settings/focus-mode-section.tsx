import { useState, type ReactElement } from 'react'
import { focusModeDimSchema, focusModeFontSchema, type FocusModeDim } from '@reflect/core'
import { Input } from '@/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'
import {
  useFocusModeDim,
  useFocusModeFont,
  useFocusModeFullscreen,
  useFocusModeTypewriter,
  useSettingsService,
} from '@/providers/settings-provider.tsx'
import { SettingsField } from './field.tsx'
import { SettingsSection } from './section.tsx'
import { SettingsSwitchField } from './switch-field.tsx'

const DIM_OPTIONS: { value: FocusModeDim; label: string }[] = [
  { value: 'sentence', label: 'Sentence' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'off', label: 'Nothing' },
]

/**
 * How focus mode (⌘⇧F) behaves. The mode itself is toggled from the keyboard,
 * the View menu or the palette; these settings shape what it does.
 */
export function FocusModeSection(): ReactElement {
  const dim = useFocusModeDim()
  const typewriter = useFocusModeTypewriter()
  const fullscreen = useFocusModeFullscreen()
  const settingsService = useSettingsService()

  return (
    <SettingsSection id="focus-mode">
      <SettingsField
        legend="Highlight"
        description="What stays at full strength while the rest of the note fades."
      >
        <div className="mt-3">
          <Select
            value={dim}
            items={DIM_OPTIONS}
            onValueChange={(value) => {
              settingsService.update({ focusModeDim: focusModeDimSchema.parse(value) })
            }}
          >
            <SelectTrigger aria-label="Focus mode highlight" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {DIM_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </SettingsField>

      <SettingsSwitchField
        legend="Typewriter scrolling"
        description="Keep the line you are writing in the middle of the window."
        checked={typewriter}
        onCheckedChange={(checked) => settingsService.update({ focusModeTypewriter: checked })}
      />

      <SettingsSwitchField
        legend="Full screen"
        description="Take the window full screen while focus mode is on."
        checked={fullscreen}
        onCheckedChange={(checked) => settingsService.update({ focusModeFullscreen: checked })}
      />

      <FocusModeFontField />
    </SettingsSection>
  )
}

/**
 * The focus-mode font: free text, saved when the field loses focus or on
 * Return so a half-typed name never reaches the editor.
 */
function FocusModeFontField(): ReactElement {
  const saved = useFocusModeFont()
  const settingsService = useSettingsService()
  const [draft, setDraft] = useState<string | null>(null)

  const commit = (): void => {
    if (draft === null) {
      return
    }
    settingsService.update({ focusModeFont: focusModeFontSchema.parse(draft) })
    setDraft(null)
  }

  return (
    <SettingsField
      legend="Font"
      description="The name of an installed font to write in. Leave empty to keep the editor font."
    >
      <div className="mt-3">
        <Input
          aria-label="Focus mode font"
          className="w-64"
          placeholder="e.g. IBM Plex Mono"
          spellCheck={false}
          value={draft ?? saved}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit()
            }
          }}
        />
      </div>
    </SettingsField>
  )
}
