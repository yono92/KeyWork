import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[var(--retro-radius)] border px-2 py-0.5 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[var(--retro-border-dark)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]",
        secondary:
          "border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)] text-[var(--retro-text)]",
        destructive:
          "border-[#75251f] bg-[#b63d35] text-white",
        outline: "border-[var(--retro-border-mid)] bg-transparent text-[var(--retro-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
