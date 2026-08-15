"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/cn"

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"])
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp"

type Props = {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

function filterImageFiles(fileList: FileList | File[]): File[] {
  return Array.from(fileList).filter((file) => ACCEPTED.has(file.type))
}

export function PhotoDropzone({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      if (disabled) return
      const files = filterImageFiles(list)
      if (files.length === 0) return
      onFiles(files)
    },
    [disabled, onFiles],
  )

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 border border-dashed px-6 py-16 text-center transition sm:py-20",
        dragging
          ? "border-ink bg-[var(--accent)]/15"
          : "border-[var(--line)] bg-[var(--surface)] hover:border-ink/40",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ""
        }}
      />
      <p className="font-[family-name:var(--font-newsreader)] text-3xl text-ink sm:text-4xl">
        Drop 2–20 photos
      </p>
      <p className="text-sm text-[var(--muted)]">JPEG, PNG or WebP</p>
      <Button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          inputRef.current?.click()
        }}
      >
        Choose photos
      </Button>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--muted)]">
        Originals stay local. We create smaller working copies for analysis
      </p>
    </div>
  )
}
