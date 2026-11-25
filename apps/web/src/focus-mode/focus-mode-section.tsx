import { useState, type ReactElement } from 'react'
import {
  focusModeDimSchema,
  focusModeFontSchema,
  focusModeTextSizeSchema,
  FOCUS_MODE_TEXT_SIZE_RANGE,
  focusModeLineWidthSchema,
  focusModeParagraphSpacingSchema,
  focusModeMarkdownSyntaxSchema,
  type FocusModeDim,
  type FocusModeMarkdownSyntax,
  type FocusModeParagraphSpacing,
} from '@reflect/core'
import { Input } from '@/components/ui/input.tsx'
import { Slider } from '@/components/ui/slider.tsx'
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
  useFocusModeTextSize,
  useFocusModeFullscreen,
  useFocusModeLineWidth,
  useFocusModeMarkdownSyntax,
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

const LINE_WIDTH_OPTIONS: Option<number>[] = [56, 64, 72, 80].map((width) => ({
  value: width,
  label: `${width} characters`,
}))

const PARAGRAPH_SPACING_OPTIONS: Option<FocusModeParagraphSpacing>[] = [
  { value: 'full', label: 'Blank line' },
  { value: 'half', label: 'Half line' },
  { value: 'tight', label: 'Tight' },
]

const MARKDOWN_SYNTAX_OPTIONS: Option<FocusModeMarkdownSyntax>[] = [
  { value: 'show', label: 'Show' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'hide', label: 'Hide' },
  { value: 'editor', label: 'Same as editor' },
]

/**
 * How focus mode (⌘⇧F) behaves. The mode itself is toggled from the keyboard,
 * the View menu or the palette; these settings shape what it does.
 */
export function FocusModeSection(): ReactElement {
  const dim = useFocusModeDim()
  const typewriter = useFocusModeTypewriter()
  const fullscreen = useFocusModeFullscreen()
  const lineWidth = useFocusModeLineWidth()
  const paragraphSpacing = useFocusModeParagraphSpacing()
  const markdownSyntax = useFocusModeMarkdownSyntax()
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

      <FocusModeTextSizeField />

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

      <FocusModeSelectField
        legend="Markdown syntax"
        description="Show the markdown marks while focus mode is on. Your editor setting comes back when you leave."
        label="Focus mode markdown syntax"
        value={markdownSyntax}
        options={MARKDOWN_SYNTAX_OPTIONS}
        onChange={(value) => {
          return settingsService.update({
            focusModeMarkdownSyntax: focusModeMarkdownSyntaxSchema.parse(value),
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

/** "Default" at 0, otherwise the signed step ("+2", "−1"). */
function describeTextSize(step: number): string {
  if (step === 0) {
    return 'Default'
  }
  return step > 0 ? `+${step}` : `−${-step}`
}

/**
 * Focus mode's text size, iA Writer style: a slider of steps around the
 * default rather than a pixel size, since the base size follows the window
 * width. Saved when the drag ends, not on every step.
 */
function FocusModeTextSizeField(): ReactElement {
  const saved = useFocusModeTextSize()
  const settingsService = useSettingsService()
  const [draft, setDraft] = useState<number | null>(null)
  const step = draft ?? saved

  return (
    <SettingsField
      legend="Text size"
      description="Focus mode's text grows with the window, like iA Writer. This scales it at every width."
    >
      <div className="mt-3 flex w-72 items-center gap-3">
        <span aria-hidden className="text-xs text-text-muted">
          A
        </span>
        <Slider
          min={FOCUS_MODE_TEXT_SIZE_RANGE.min}
          max={FOCUS_MODE_TEXT_SIZE_RANGE.max}
          step={1}
          value={step}
          getAriaLabel={() => 'Focus mode text size'}
          getAriaValueText={(_formatted, value) => describeTextSize(value)}
          onValueChange={(value) => setDraft(value)}
          onValueCommitted={(value) => {
            settingsService.update({ focusModeTextSize: focusModeTextSizeSchema.parse(value) })
            setDraft(null)
          }}
        />
        <span aria-hidden className="text-lg text-text-muted">
          A
        </span>
      </div>
      <p className="mt-1 w-72 text-center text-xs text-text-muted tabular-nums">
        {describeTextSize(step)}
      </p>
    </SettingsField>
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
