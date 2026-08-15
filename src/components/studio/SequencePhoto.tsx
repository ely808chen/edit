"use client"

import type { CSSProperties } from "react"
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core"
import { GripVertical } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/cn"
import type { SequenceItem } from "@/lib/ai/schemas"
import type { ClientPhoto } from "@/types"

type DragHandleProps = {
  listeners?: DraggableSyntheticListeners
  attributes?: DraggableAttributes
}

type Props = {
  item: SequenceItem
  photo: ClientPhoto
  isUserEdited?: boolean
  dimmed?: boolean
  dragStyle?: CSSProperties
  dragHandle?: DragHandleProps
  setNodeRef?: (node: HTMLElement | null) => void
  onReplace: () => void
  onOpen: () => void
}

export function SequencePhoto({
  item,
  photo,
  isUserEdited,
  dimmed,
  dragStyle,
  dragHandle,
  setNodeRef,
  onReplace,
  onOpen,
}: Props) {
  const position = String(item.position).padStart(2, "0")

  return (
    <article
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        "flex w-[min(78vw,280px)] shrink-0 flex-col gap-3 sm:w-auto",
        dimmed && "opacity-35",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          {position}
        </p>
        <div className="flex items-center gap-1">
          {isUserEdited ? (
            <span className="bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink">
              Your edit
            </span>
          ) : null}
          <button
            type="button"
            aria-label={`Drag ${photo.id.toUpperCase()}`}
            className="cursor-grab touch-none rounded-sm p-1 text-[var(--muted)] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:cursor-grabbing"
            {...dragHandle?.attributes}
            {...dragHandle?.listeners}
          >
            <GripVertical size={16} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="overflow-hidden bg-[var(--darkroom)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl || photo.thumbnailDataUrl}
          alt={`Photo ${photo.id.toUpperCase()}`}
          className="aspect-[4/5] h-auto w-full object-cover sm:aspect-auto sm:max-h-[420px]"
        />
      </button>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink">
          {item.role.replace(/-/g, " ")}
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          {item.reason}
        </p>
        {item.relationshipToPrevious ? (
          <div className="border-t border-[var(--line)] pt-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              From previous
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {item.relationshipToPrevious}
            </p>
          </div>
        ) : null}
        <Button
          variant="secondary"
          className="mt-1 w-full text-xs uppercase tracking-[0.14em]"
          onClick={onReplace}
        >
          Replace
        </Button>
      </div>
    </article>
  )
}
