import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-[var(--retro-radius)] border-2 border-[var(--retro-border-mid)] border-t-[var(--retro-border-dark)] border-l-[var(--retro-border-dark)] border-r-[var(--retro-border-light)] border-b-[var(--retro-border-light)] bg-[var(--retro-field-bg)] px-3 py-1 text-base text-[var(--retro-field-text)] shadow-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--retro-field-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
