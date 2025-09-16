import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        // 👇 importante: añadimos group para usar group-hover
        "group relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      {/* Fondo (track) */}
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-zinc-900 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
        )}
      >
        {/* Progreso (range) */}
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-[#eeeeee] hover:bg-[#1DB954] absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>

      {/* Thumb (punto que arrastras) */}
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="bg-white border border-white block size-3 shrink-0 rounded-full shadow-sm
                     opacity-0 group-hover:opacity-100
                     hover:bg-[#1DB954] hover:border-[#1DB954]
                     transition-opacity duration-200
                     focus-visible:outline-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
