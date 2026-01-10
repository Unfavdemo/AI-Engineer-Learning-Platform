import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled-events-none disabled-50 [&_svg]-events-none [&_svg([class*='size-'])]-4 shrink-0 [&_svg]-0 outline-none focus-visible-ring focus-visible-ring/50 focus-visible-[3px] aria-invalid-destructive/20 dark-invalid-destructive/40 aria-invalid-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover-primary/90",
        destructive:
          "bg-destructive text-white hover-destructive/90 focus-visible-destructive/20 dark-visible-destructive/40 dark-destructive/60",
        outline:
          "border bg-background text-foreground hover-accent hover-accent-foreground dark-input/30 dark-input dark-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover-secondary/80",
        ghost:
          "hover-accent hover-accent-foreground dark-accent/50",
        link: "text-primary underline-offset-4 hover",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  });

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
