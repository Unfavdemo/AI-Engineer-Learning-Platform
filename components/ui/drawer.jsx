"use client";

import * as React from "react";
import { Drawer } from "vaul@1.1.2";

import { cn } from "./utils";

function Drawer({
  ...props
}) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
  ...props
}) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]-in data-[state=closed]-out data-[state=closed]-out-0 data-[state=open]-in-0 fixed inset-0 z-50 bg-black/50",
        className)}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]-x-0 data-[vaul-drawer-direction=top]-0 data-[vaul-drawer-direction=top]-24 data-[vaul-drawer-direction=top]-h-[80vh] data-[vaul-drawer-direction=top]-b-lg data-[vaul-drawer-direction=top]-b",
          "data-[vaul-drawer-direction=bottom]-x-0 data-[vaul-drawer-direction=bottom]-0 data-[vaul-drawer-direction=bottom]-24 data-[vaul-drawer-direction=bottom]-h-[80vh] data-[vaul-drawer-direction=bottom]-t-lg data-[vaul-drawer-direction=bottom]-t",
          "data-[vaul-drawer-direction=right]-y-0 data-[vaul-drawer-direction=right]-0 data-[vaul-drawer-direction=right]-3/4 data-[vaul-drawer-direction=right]-l data-[vaul-drawer-direction=right]-w-sm",
          "data-[vaul-drawer-direction=left]-y-0 data-[vaul-drawer-direction=left]-0 data-[vaul-drawer-direction=left]-3/4 data-[vaul-drawer-direction=left]-r data-[vaul-drawer-direction=left]-w-sm",
          className)}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
