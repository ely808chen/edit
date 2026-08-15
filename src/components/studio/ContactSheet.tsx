"use client"

import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/cn"
import type { ClientPhoto } from "@/types"

type Props = {
  photos: ClientPhoto[]
  onRemove: (id: string) => void
  onClear: () => void
  onOpen: (id: string) => void
  disabled?: boolean
}

function statusLabel(photo: ClientPhoto): string | null {
  switch (photo.uploadStatus) {
    case "processing":
      return "Preparing…"
    case "uploading":
      return "Uploading…"
    case "error":
      return photo.errorMessage || "Failed"
    default:
      return null
  }
}

export function ContactSheet({
  photos,
  onRemove,
  onClear,
  onOpen,
  disabled,
}: Props) {
  if (photos.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Contact sheet
          </p>
          <p className="mt-1 text-sm text-ink">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              !window.confirm("Clear all photos from this edit?")
            ) {
              return
            }
            onClear()
          }}
          className="text-xs uppercase tracking-[0.14em]"
        >
          Clear all
        </Button>
      </div>

      <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
        {photos.map((photo) => {
          const status = statusLabel(photo)
          const isError = photo.uploadStatus === "error"
          const isBusy =
            photo.uploadStatus === "processing" ||
            photo.uploadStatus === "uploading"

          return (
            <figure
              key={photo.id}
              className={cn(
                "group relative mb-3 break-inside-avoid overflow-hidden bg-[var(--darkroom)]",
                isError && "ring-1 ring-[var(--danger)]",
              )}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOpen(photo.id)}
                className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl || photo.thumbnailDataUrl}
                  alt={`Photo ${photo.id.toUpperCase()}`}
                  className={cn(
                    "h-auto w-full object-cover transition",
                    isBusy && "opacity-60",
                  )}
                />
              </button>

              <figcaption className="pointer-events-none absolute left-2 top-2 bg-[var(--darkroom)]/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white">
                {photo.id.toUpperCase()}
              </figcaption>

              {status ? (
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-2 left-2 right-10 truncate text-[10px] uppercase tracking-[0.12em]",
                    isError ? "text-[var(--danger)]" : "text-white/80",
                  )}
                >
                  {status}
                </span>
              ) : null}

              <button
                type="button"
                aria-label={`Remove ${photo.id.toUpperCase()}`}
                title="Remove photo"
                disabled={disabled}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onRemove(photo.id)
                }}
                className="absolute right-1.5 top-1.5 z-10 inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm bg-black/75 text-white shadow-sm transition hover:bg-[var(--danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} strokeWidth={2.25} />
                <span className="sr-only">Remove</span>
              </button>
            </figure>
          )
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Trash2 size={12} aria-hidden />
        Tap the × on a frame to remove it from this edit.
      </p>
    </section>
  )
}
