"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider@1.2.3";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        .isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]-50 data-[orientation=vertical]-full data-[orientation=vertical]-h-44 data-[orientation=vertical]-auto data-[orientation=vertical]-col",
        className)}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]-4 data-[orientation=horizontal]-full data-[orientation=vertical]-full data-[orientation=vertical]-1.5")}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "bg-primary absolute data-[orientation=horizontal]-full data-[orientation=vertical]-full")}
        />
      </SliderPrimitive.Track>
      {Array.from({ length.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-primary bg-background ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover-4 focus-visible-4 focus-visible-hidden disabled-events-none disabled-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
