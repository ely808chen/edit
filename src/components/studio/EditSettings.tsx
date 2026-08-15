"use client"

import { Button } from "@/components/ui/Button"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { availableTargetCounts } from "@/lib/limits"
import { cn } from "@/lib/utils/cn"
import type { EditMode } from "@/lib/ai/schemas"

type Props = {
  mode: EditMode
  targetCount: number
  photoCount: number
  onModeChange: (mode: EditMode) => void
  onTargetChange: (count: number) => void
  onSubmit: () => void
  canSubmit: boolean
  submitting?: boolean
}

export function EditSettings({
  mode,
  targetCount,
  photoCount,
  onModeChange,
  onTargetChange,
  onSubmit,
  canSubmit,
  submitting,
}: Props) {
  const counts = availableTargetCounts(photoCount)

  return (
    <section className="space-y-8 border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <SegmentedControl<EditMode>
        label="What are you making?"
        value={mode}
        onChange={onModeChange}
        options={[
          {
            value: "photography",
            label: "Photography Set",
            description: "The strongest coherent body of work",
          },
          {
            value: "instagram",
            label: "Instagram Carousel",
            description:
              "A sequence designed to open strongly and hold visual rhythm",
          },
        ]}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            How many stay?
          </p>
          <p className="text-xs text-[var(--muted)]">
            {photoCount === 0
              ? "Add photos to choose a final count"
              : `1–${counts.length || 1} available from ${photoCount} uploaded`}
          </p>
        </div>
        {counts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Upload at least two photos to choose how many stay.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {counts.map((count) => {
              const selected = count === targetCount
              return (
                <button
                  key={count}
                  type="button"
                  aria-pressed={selected}
                  disabled={submitting}
                  onClick={() => onTargetChange(count)}
                  className={cn(
                    "min-w-11 rounded-sm border px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                    selected
                      ? "border-ink bg-ink text-[var(--background)]"
                      : "border-[var(--line)] bg-transparent text-ink hover:border-ink/40",
                  )}
                >
                  {count}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Button
        className="w-full sm:w-auto"
        disabled={!canSubmit || submitting}
        onClick={onSubmit}
      >
        {submitting ? "Building…" : "Build my edit →"}
      </Button>
    </section>
  )
}
