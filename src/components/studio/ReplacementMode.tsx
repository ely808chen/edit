"use client"

import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"

type Props = {
  active: boolean
  targetPhotoId: string | null
  pendingReplacementId: string | null
  onCancel: () => void
  onConfirm: () => void
  onDismissConfirm: () => void
}

export function ReplacementMode({
  active,
  targetPhotoId,
  pendingReplacementId,
  onCancel,
  onConfirm,
  onDismissConfirm,
}: Props) {
  const confirmOpen = Boolean(targetPhotoId && pendingReplacementId)

  return (
    <>
      {active && targetPhotoId ? (
        <div className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--accent)] px-4 py-3 text-ink sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Replacing{" "}
              <span className="font-medium uppercase tracking-[0.08em]">
                {targetPhotoId}
              </span>
              . Pick a photo from below.
            </p>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        onClose={onDismissConfirm}
        title="Confirm replacement"
      >
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Replace {targetPhotoId?.toLowerCase()} with{" "}
          {pendingReplacementId?.toLowerCase()}?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onDismissConfirm}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Replace</Button>
        </div>
      </Modal>
    </>
  )
}
