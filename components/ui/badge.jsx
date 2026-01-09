import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]-3 gap-1 [&>svg]-events-none focus-visible-ring focus-visible-ring/50 focus-visible-[3px] aria-invalid-destructive/20 dark-invalid-destructive/40 aria-invalid-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]-destructive/90 focus-visible-destructive/20 dark-visible-destructive/40 dark-destructive/60",
        outline:
          "text-foreground [a&]-accent [a&]-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) &
   & { asChild? }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
