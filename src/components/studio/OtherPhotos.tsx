"use client"

import { cn } from "@/lib/utils/cn"
import type { NotableCut } from "@/lib/ai/schemas"
import type { ClientPhoto } from "@/types"

type Props = {
  photos: ClientPhoto[]
  selectedIds: Set<string>
  notableCuts: NotableCut[]
  onOpen: (id: string) => void
  onPickForReplace?: (id: string) => void
  replaceMode?: boolean
}

export function OtherPhotos({
  photos,
  selectedIds,
  notableCuts,
  onOpen,
  onPickForReplace,
  replaceMode,
}: Props) {
  const others = photos.filter((photo) => !selectedIds.has(photo.id))
  if (others.length === 0) return null

  const cutById = new Map(notableCuts.map((cut) => [cut.photoId, cut]))

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-newsreader)] text-2xl text-ink sm:text-3xl">
          NOT IN THE EDIT
        </h2>
        {replaceMode ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Choose a photo to bring into the sequence
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {others.map((photo) => {
          const cut = cutById.get(photo.id)
          return (
            <figure
              key={photo.id}
              className={cn(
                "group flex flex-col gap-2",
                replaceMode &&
                  "ring-1 ring-transparent transition hover:ring-ink",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  if (replaceMode && onPickForReplace) {
                    onPickForReplace(photo.id)
                    return
                  }
                  onOpen(photo.id)
                }}
                className="relative overflow-hidden bg-[var(--darkroom)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl || photo.thumbnailDataUrl}
                  alt={`Photo ${photo.id.toUpperCase()}`}
                  className="aspect-[4/5] h-auto w-full object-cover opacity-90 transition group-hover:opacity-100"
                />
                <span className="absolute left-2 top-2 bg-[var(--darkroom)]/75 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white">
                  {photo.id.toUpperCase()}
                </span>
              </button>

              <figcaption className="space-y-1 px-0.5">
                {cut ? (
                  <>
                    {cut.redundantWith ? (
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink">
                        Redundant with {cut.redundantWith.toUpperCase()}
                      </p>
                    ) : (
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink">
                        Notable cut
                      </p>
                    )}
                    <p className="text-xs leading-relaxed text-[var(--muted)]">
                      {cut.reason}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Not selected
                  </p>
                )}
              </figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}
