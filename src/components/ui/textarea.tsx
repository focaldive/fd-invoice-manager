import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-placeholder flex field-sizing-content min-h-16 w-full px-3 py-2.5 text-base outline-none disabled:cursor-not-allowed md:text-sm bg-background shadow-regular-xs border-0 ring-1 ring-input rounded-[10px] transition duration-200 ease-out hover:bg-card focus-visible:bg-background focus-visible:ring-foreground/80 focus-visible:shadow-focus-neutral aria-invalid:ring-error aria-invalid:focus-visible:shadow-focus-error disabled:bg-card disabled:shadow-none disabled:ring-transparent disabled:text-faint",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
