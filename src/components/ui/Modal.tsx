"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils/cn"

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-sm bg-[var(--surface)] p-5 text-ink shadow-xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-sm p-1 text-[var(--muted)] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <X size={18} />
        </button>
        {title ? (
          <h2 className="pr-8 font-[family-name:var(--font-newsreader)] text-xl">
            {title}
          </h2>
        ) : null}
        <div className={cn(title && "mt-3")}>{children}</div>
      </div>
    </div>
  )
}
