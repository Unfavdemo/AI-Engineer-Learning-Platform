"use client";

import * as React from "react";
import * as hover-cardPrimitive from "@radix-ui/react-hover-card@1.1.6 from "@radix-ui/react-hover-card@1.1.6";

import { cn } from "./utils";

function HoverCard({
  ...props
}) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({
  ...props
}) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]-in data-[state=closed]-out data-[state=closed]-out-0 data-[state=open]-in-0 data-[state=closed]-out-95 data-[state=open]-in-95 data-[side=bottom]-in-from-top-2 data-[side=left]-in-from-right-2 data-[side=right]-in-from-left-2 data-[side=top]-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className)}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
