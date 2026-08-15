"use client"

import { useMemo, useState } from "react"
import { EditorTrace } from "@/components/studio/EditorTrace"
import { OtherPhotos } from "@/components/studio/OtherPhotos"
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/studio/PhotoLightbox"
import { ReplacementMode } from "@/components/studio/ReplacementMode"
import { SortableSequence } from "@/components/studio/SortableSequence"
import type { SequenceItem } from "@/lib/ai/schemas"
import type { ClientPhoto, EditResponse } from "@/types"

type Props = {
  result: EditResponse
  photos: ClientPhoto[]
  onReorder: (ids: string[]) => void
  onReplace: (
    position: number,
    newId: string,
    oldItem: SequenceItem,
  ) => void
  userEditedPhotoIds: Set<string>
  replacementTargetPhotoId: string | null
  onSetReplacementTarget: (photoId: string | null) => void
}

export function EditResultView({
  result,
  photos,
  onReorder,
  onReplace,
  userEditedPhotoIds,
  replacementTargetPhotoId,
  onSetReplacementTarget,
}: Props) {
  const { result: edit, debug } = result
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [pendingReplacementId, setPendingReplacementId] = useState<
    string | null
  >(null)

  const selectedIds = useMemo(
    () => new Set(edit.sequence.map((item) => item.photoId)),
    [edit.sequence],
  )

  const cutById = useMemo(
    () => new Map(edit.notableCuts.map((cut) => [cut.photoId, cut])),
    [edit.notableCuts],
  )

  const sequenceMeta = useMemo(() => {
    const map = new Map<string, SequenceItem>()
    for (const item of edit.sequence) map.set(item.photoId, item)
    return map
  }, [edit.sequence])

  const lightboxPhotos: LightboxPhoto[] = useMemo(
    () =>
      photos.map((photo) => {
        const selected = selectedIds.has(photo.id)
        const item = sequenceMeta.get(photo.id)
        const cut = cutById.get(photo.id)
        return {
          id: photo.id,
          src: photo.previewUrl || photo.thumbnailDataUrl,
          selected,
          role: item?.role,
          cutReason: selected ? undefined : cut?.reason,
        }
      }),
    [photos, selectedIds, sequenceMeta, cutById],
  )

  function openPhoto(id: string) {
    const index = lightboxPhotos.findIndex((photo) => photo.id === id)
    if (index >= 0) setLightboxIndex(index)
  }

  function confirmReplace() {
    if (!replacementTargetPhotoId || !pendingReplacementId) return
    const oldItem = sequenceMeta.get(replacementTargetPhotoId)
    if (!oldItem) return
    onReplace(oldItem.position, pendingReplacementId, oldItem)
    setPendingReplacementId(null)
  }

  return (
    <div className="space-y-10">
      <ReplacementMode
        active={Boolean(replacementTargetPhotoId)}
        targetPhotoId={replacementTargetPhotoId}
        pendingReplacementId={pendingReplacementId}
        onCancel={() => {
          onSetReplacementTarget(null)
          setPendingReplacementId(null)
        }}
        onConfirm={confirmReplace}
        onDismissConfirm={() => setPendingReplacementId(null)}
      />

      <header className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            The edit
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-ink">
            {edit.sequence.length} photos
          </p>
        </div>
        <p className="max-w-3xl font-[family-name:var(--font-newsreader)] text-2xl leading-snug text-ink sm:text-3xl">
          {edit.editSummary}
        </p>
      </header>

      <SortableSequence
        items={edit.sequence}
        photos={photos}
        onReorder={onReorder}
        onReplace={(photoId) => {
          onSetReplacementTarget(photoId)
          setPendingReplacementId(null)
        }}
        onOpen={openPhoto}
        userEditedIds={userEditedPhotoIds}
        replacementTargetPhotoId={replacementTargetPhotoId}
      />

      <OtherPhotos
        photos={photos}
        selectedIds={selectedIds}
        notableCuts={edit.notableCuts}
        onOpen={openPhoto}
        replaceMode={Boolean(replacementTargetPhotoId)}
        onPickForReplace={(id) => setPendingReplacementId(id)}
      />

      <EditorTrace debug={debug} />

      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  )
}
