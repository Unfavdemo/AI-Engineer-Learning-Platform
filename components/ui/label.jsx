"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label@2.1.2 from "@radix-ui/react-label@2.1.2";

import { cn } from "./utils";

function Label({
  className,
  ...props
}) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]-events-none group-data-[disabled=true]-50 peer-disabled-not-allowed peer-disabled-50",
        className)}
      {...props}
    />
  );
}

export { Label };
