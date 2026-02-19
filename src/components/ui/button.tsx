import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--retro-radius)] border-2 text-sm font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-surface)] text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)]",
        destructive:
          "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[#b63d35] text-white hover:bg-[#c94a41]",
        outline:
          "border-[var(--retro-border-mid)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-surface-alt)] text-[var(--retro-text)] hover:bg-[var(--retro-surface)]",
        secondary:
          "border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] border-l-[var(--retro-border-light)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)] hover:bg-[var(--retro-accent-2)]",
        ghost: "border-transparent bg-transparent text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)] hover:border-[var(--retro-border-mid)]",
        link: "border-0 bg-transparent p-0 text-primary underline-offset-2 hover:underline active:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
