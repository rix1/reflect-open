import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@/lib/utils.ts'

/**
 * A single-value slider (shadcn's base-nova slider, one thumb). Pass the
 * thumb's accessible name and spoken value through `getAriaLabel` /
 * `getAriaValueText`.
 */
function Slider({
  className,
  getAriaLabel,
  getAriaValueText,
  ...props
}: SliderPrimitive.Root.Props<number> &
  Pick<SliderPrimitive.Thumb.Props, 'getAriaLabel' | 'getAriaValueText'>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('data-horizontal:w-full', className)}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center py-2 select-none data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1 w-full grow overflow-hidden rounded-full bg-muted select-none"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="h-full bg-primary select-none"
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          getAriaLabel={getAriaLabel}
          getAriaValueText={getAriaValueText}
          className="relative block size-4 shrink-0 rounded-full border border-ring bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] select-none hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden data-disabled:pointer-events-none"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
