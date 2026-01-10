"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react@0.487.0";
import * from "react-resizable-panels@2.1.7";

import { cn } from "./utils";

function ResizablePanelGroup({
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]-col",
        className)}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}) {
  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible-ring relative flex w-px items-center justify-center after after-y-0 after-1/2 after-1 after:-translate-x-1/2 focus-visible-1 focus-visible-offset-1 focus-visible-hidden data-[panel-group-direction=vertical]-px data-[panel-group-direction=vertical]-full data-[panel-group-direction=vertical]-0 data-[panel-group-direction=vertical]-1 data-[panel-group-direction=vertical]-full data-[panel-group-direction=vertical]:-translate-y-1/2 data-[panel-group-direction=vertical]-x-0 [&[data-panel-group-direction=vertical]>div]-90",
        className)}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
