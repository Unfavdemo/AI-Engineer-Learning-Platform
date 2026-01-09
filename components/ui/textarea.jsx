import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder-muted-foreground focus-visible-ring focus-visible-ring/50 aria-invalid-destructive/20 dark-invalid-destructive/40 aria-invalid-destructive dark-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible-[3px] disabled-not-allowed disabled-50 md-sm",
        className)}
      {...props}
    />
  );
}

export { Textarea };
