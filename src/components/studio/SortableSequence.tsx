"use client"

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useEffect, useState } from "react"
import { SequencePhoto } from "@/components/studio/SequencePhoto"
import type { SequenceItem } from "@/lib/ai/schemas"
import type { ClientPhoto } from "@/types"

type Props = {
  items: SequenceItem[]
  photos: ClientPhoto[]
  onReorder: (ids: string[]) => void
  onReplace: (photoId: string) => void
  onOpen: (photoId: string) => void
  userEditedIds: Set<string>
  replacementTargetPhotoId?: string | null
}

function SortableItem({
  item,
  photo,
  isUserEdited,
  dimmed,
  onReplace,
  onOpen,
}: {
  item: SequenceItem
  photo: ClientPhoto
  isUserEdited: boolean
  dimmed: boolean
  onReplace: () => void
  onOpen: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.photoId })

  return (
    <SequencePhoto
      item={item}
      photo={photo}
      isUserEdited={isUserEdited}
      dimmed={dimmed}
      setNodeRef={setNodeRef}
      dragStyle={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
        opacity: isDragging ? 0.92 : undefined,
      }}
      dragHandle={{ attributes, listeners }}
      onReplace={onReplace}
      onOpen={onOpen}
    />
  )
}

export function SortableSequence({
  items,
  photos,
  onReorder,
  onReplace,
  onOpen,
  userEditedIds,
  replacementTargetPhotoId,
}: Props) {
  const [isNarrow, setIsNarrow] = useState(false)
  const photoById = new Map(photos.map((p) => [p.id, p]))

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const ids = items.map((item) => item.photoId)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ids}
        strategy={
          isNarrow ? horizontalListSortingStrategy : rectSortingStrategy
        }
      >
        <div
          className={
            isNarrow
              ? "-mx-4 flex gap-4 overflow-x-auto px-4 pb-2"
              : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }
        >
          {items.map((item) => {
            const photo = photoById.get(item.photoId)
            if (!photo) return null
            const dimmed = Boolean(
              replacementTargetPhotoId &&
                replacementTargetPhotoId !== item.photoId,
            )
            return (
              <SortableItem
                key={item.photoId}
                item={item}
                photo={photo}
                isUserEdited={userEditedIds.has(item.photoId)}
                dimmed={dimmed}
                onReplace={() => onReplace(item.photoId)}
                onOpen={() => onOpen(item.photoId)}
              />
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
