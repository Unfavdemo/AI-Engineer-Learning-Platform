"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox@1.1.4 from "@radix-ui/react-checkbox@1.1.4";
import { CheckIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border bg-input-background dark-input/30 data-[state=checked]-primary data-[state=checked]-primary-foreground dark-[state=checked]-primary data-[state=checked]-primary focus-visible-ring focus-visible-ring/50 aria-invalid-destructive/20 dark-invalid-destructive/40 aria-invalid-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible-[3px] disabled-not-allowed disabled-50",
        className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
