"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react@0.487.0";
import { DayPicker } from "react-day-picker@8.10.1";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover-100"),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell(
          "relative p-0 text-center text-sm focus-within focus-within-20 [&([aria-selected])]-accent [&([aria-selected].day-range-end)]-r-md",
          props.mode === "range"
            ? "[&(>.day-range-end)]-r-md [&(>.day-range-start)]-l-md first:[&([aria-selected])]-l-md last:[&([aria-selected])]-r-md"
            : "[&([aria-selected])]-md"),
        day(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected-100"),
        day_range_start:
          "day-range-start aria-selected-primary aria-selected-primary-foreground",
        day_range_end:
          "day-range-end aria-selected-primary aria-selected-primary-foreground",
        day_selected:
          "bg-primary text-primary-foreground hover-primary hover-primary-foreground focus-primary focus-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected-accent aria-selected-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
