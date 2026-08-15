"use client"

import { useEffect } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { EditRole } from "@/lib/ai/schemas"

export type LightboxPhoto = {
  id: string
  src: string
  selected?: boolean
  role?: EditRole | string
  cutReason?: string
}

type Props = {
  photos: LightboxPhoto[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: Props) {
  const photo = photos[index]
  const count = photos.length

  useEffect(() => {
    if (!photo || count === 0) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        onIndexChange((index - 1 + count) % count)
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        onIndexChange((index + 1) % count)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [photo, count, index, onClose, onIndexChange])

  if (!photo || count === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[var(--darkroom)] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${photo.id.toUpperCase()}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--darkroom-muted)]">
            {photo.id.toUpperCase()}
            <span className="mx-2 text-white/20">·</span>
            {index + 1} / {count}
          </p>
          <p className="mt-1 truncate text-sm">
            {photo.selected
              ? photo.role
                ? `Selected · ${String(photo.role).replace(/-/g, " ")}`
                : "Selected"
              : "Not selected"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-sm p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-4 sm:px-16">
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => onIndexChange((index - 1 + count) % count)}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-sm p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:left-4"
        >
          <ChevronLeft size={28} />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={`Photo ${photo.id.toUpperCase()}`}
          className="max-h-full max-w-full object-contain"
        />

        <button
          type="button"
          aria-label="Next photo"
          onClick={() => onIndexChange((index + 1) % count)}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-sm p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:right-4"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {photo.cutReason ? (
        <div className="border-t border-white/10 px-4 py-4 sm:px-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--darkroom-muted)]">
            Cut reason
          </p>
          <p
            className={cn(
              "mt-2 max-w-3xl text-sm leading-relaxed text-white/85",
            )}
          >
            {photo.cutReason}
          </p>
        </div>
      ) : null}
    </div>
  )
}
