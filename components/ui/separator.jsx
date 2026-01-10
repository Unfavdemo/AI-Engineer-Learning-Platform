"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator@1.1.2 from "@radix-ui/react-separator@1.1.2";

import { cn } from "./utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]-px data-[orientation=horizontal]-full data-[orientation=vertical]-full data-[orientation=vertical]-px",
        className)}
      {...props}
    />
  );
}

export { Separator };
