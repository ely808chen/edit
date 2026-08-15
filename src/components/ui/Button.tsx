"use client"

import { cn } from "@/lib/utils/cn"
import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-[var(--background)] hover:bg-black disabled:bg-[var(--muted)]",
  secondary:
    "bg-transparent border border-[var(--line)] text-ink hover:border-ink",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
