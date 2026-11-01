import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-placeholder selection:bg-primary selection:text-primary-foreground h-10 w-full min-w-0 px-3 py-1 text-base outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed md:text-sm bg-background shadow-regular-xs border-0 ring-1 ring-input rounded-[10px] transition duration-200 ease-out hover:bg-card focus-visible:bg-background focus-visible:ring-foreground/80 focus-visible:shadow-focus-neutral aria-invalid:ring-error aria-invalid:focus-visible:shadow-focus-error disabled:bg-card disabled:shadow-none disabled:ring-transparent disabled:text-faint",
        className
      )}
      {...props}
    />
  )
}

export { Input }
