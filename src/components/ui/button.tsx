import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Styled after AlignUI's FancyButton (filled variants) and Button "stroke" mode.
// Variant names are kept from shadcn so existing call sites don't change.
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium",
    "transition duration-200 ease-out cursor-pointer outline-none shrink-0",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    "disabled:pointer-events-none disabled:bg-card disabled:text-faint disabled:shadow-none disabled:bg-none",
    "aria-invalid:shadow-focus-error",
  ],
  {
    variants: {
      variant: {
        // FancyButton primary
        default:
          "fancy-sheen bg-primary text-primary-foreground shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--primary)] focus-visible:shadow-focus-primary",
        // FancyButton destructive
        destructive:
          "fancy-sheen bg-error text-white shadow-[0_1px_2px_0_rgba(14,18,27,0.24),0_0_0_1px_var(--error)] focus-visible:shadow-focus-error",
        // FancyButton basic (stroke)
        outline:
          "bg-background text-muted-foreground shadow-[0_1px_3px_0_rgba(14,18,27,0.12),0_0_0_1px_var(--input)] hover:bg-card hover:text-foreground hover:shadow-[0_0_0_1px_var(--input)] focus-visible:text-foreground focus-visible:shadow-focus-neutral",
        // FancyButton neutral (inverted: light button on dark UI)
        secondary:
          "fancy-sheen bg-foreground text-background shadow-[0_1px_2px_0_rgba(27,28,29,0.48),0_0_0_1px_#242628] focus-visible:shadow-focus-neutral",
        ghost:
          "text-muted-foreground hover:bg-card hover:text-foreground focus-visible:bg-card focus-visible:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-lg px-2.5",
        lg: "h-10 gap-2.5 px-4 has-[>svg]:px-3.5",
        icon: "size-9",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
