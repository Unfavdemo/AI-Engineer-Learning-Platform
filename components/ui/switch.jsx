"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch@1.1.3";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]-primary data-[state=unchecked]-switch-background focus-visible-ring focus-visible-ring/50 dark-[state=unchecked]-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible-[3px] disabled-not-allowed disabled-50",
        className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-card dark-[state=unchecked]-card-foreground dark-[state=checked]-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]-x-[calc(100%-2px)] data-[state=unchecked]-x-0")}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
