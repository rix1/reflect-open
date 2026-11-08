import { useState, type ReactElement } from 'react'
import {
  focusModeDimSchema,
  focusModeFontSchema,
  focusModeFontSizeSchema,
  focusModeLineWidthSchema,
  focusModeParagraphSpacingSchema,
  type FocusModeDim,
  type FocusModeParagraphSpacing,
} from '@reflect/core'
import { Input } from '@/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'
import { SettingsField } from '@/components/settings/field.tsx'
import { SettingsSection } from '@/components/settings/section.tsx'
import { SettingsSwitchField } from '@/components/settings/switch-field.tsx'
import { useSettingsService } from '@/providers/settings-provider.tsx'
import {
  useFocusModeDim,
  useFocusModeFont,
  useFocusModeFontSize,
  useFocusModeFullscreen,
  useFocusModeLineWidth,
  useFocusModeParagraphSpacing,
  useFocusModeTypewriter,
} from './use-focus-mode-settings.ts'

interface Option<Value> {
  value: Value
  label: string
}

const DIM_OPTIONS: Option<FocusModeDim>[] = [
  { value: 'sentence', label: 'Sentence' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'off', label: 'Nothing' },
]

const FONT_SIZE_OPTIONS: Option<number>[] = [14, 15, 16, 17, 18, 19, 20, 22].map((size) => ({
  value: size,
  label: `${size} px`,
}))

const LINE_WIDTH_OPTIONS: Option<number>[] = [56, 64, 72, 80].map((width) => ({
  value: width,
  label: `${width} characters`,
}))

const PARAGRAPH_SPACING_OPTIONS: Option<FocusModeParagraphSpacing>[] = [
  { value: 'full', label: 'Blank line' },
  { value: 'half', label: 'Half line' },
  { value: 'tight', label: 'Tight' },
]

/**
 * How focus mode (⌘⇧F) behaves. The mode itself is toggled from the keyboard,
 * the View menu or the palette; these settings shape what it does.
 */
export function FocusModeSection(): ReactElement {
  const dim = useFocusModeDim()
  const typewriter = useFocusModeTypewriter()
  const fullscreen = useFocusModeFullscreen()
  const fontSize = useFocusModeFontSize()
  const lineWidth = useFocusModeLineWidth()
  const paragraphSpacing = useFocusModeParagraphSpacing()
  const settingsService = useSettingsService()

  return (
    <SettingsSection id="focus-mode">
      <FocusModeSelectField
        legend="Highlight"
        description="What stays at full strength while the rest of the note fades."
        label="Focus mode highlight"
        value={dim}
        options={DIM_OPTIONS}
        onChange={(value) => {
          return settingsService.update({ focusModeDim: focusModeDimSchema.parse(value) })
        }}
      />

      <FocusModeSelectField
        legend="Text size"
        description="How large focus mode sets the text, apart from the editor's size."
        label="Focus mode text size"
        value={fontSize}
        options={FONT_SIZE_OPTIONS}
        onChange={(value) => {
          return settingsService.update({ focusModeFontSize: focusModeFontSizeSchema.parse(value) })
        }}
      />

      <FocusModeSelectField
        legend="Line width"
        description="How many characters fit on a line before it wraps."
        label="Focus mode line width"
        value={lineWidth}
        options={LINE_WIDTH_OPTIONS}
        onChange={(value) => {
          return settingsService.update({
            focusModeLineWidth: focusModeLineWidthSchema.parse(value),
          })
        }}
      />

      <FocusModeSelectField
        legend="Paragraph spacing"
        description="The space between paragraphs. Items in a list stay together."
        label="Focus mode paragraph spacing"
        value={paragraphSpacing}
        options={PARAGRAPH_SPACING_OPTIONS}
        onChange={(value) => {
          return settingsService.update({
            focusModeParagraphSpacing: focusModeParagraphSpacingSchema.parse(value),
          })
        }}
      />

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

interface FocusModeSelectFieldProps<Value extends string | number> {
  legend: string
  description: string
  /** The trigger's accessible name. */
  label: string
  value: Value
  options: Option<Value>[]
  onChange: (value: Value) => void
}

/** One focus-mode setting picked from a short list. */
function FocusModeSelectField<Value extends string | number>({
  legend,
  description,
  label,
  value,
  options,
  onChange,
}: FocusModeSelectFieldProps<Value>): ReactElement {
  return (
    <SettingsField legend={legend} description={description}>
      <div className="mt-3">
        <Select
          value={value}
          items={options}
          onValueChange={(next) => {
            if (next !== null) {
              onChange(next)
            }
          }}
        >
          <SelectTrigger aria-label={label} className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </SettingsField>
  )
}
