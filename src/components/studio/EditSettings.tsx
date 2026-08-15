"use client"

import { Button } from "@/components/ui/Button"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { cn } from "@/lib/utils/cn"
import type { EditMode } from "@/lib/ai/schemas"

const TARGET_COUNTS = [4, 5, 6, 7, 8] as const

type Props = {
  mode: EditMode
  targetCount: number
  onModeChange: (mode: EditMode) => void
  onTargetChange: (count: number) => void
  onSubmit: () => void
  canSubmit: boolean
  submitting?: boolean
}

export function EditSettings({
  mode,
  targetCount,
  onModeChange,
  onTargetChange,
  onSubmit,
  canSubmit,
  submitting,
}: Props) {
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
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          How many stay?
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGET_COUNTS.map((count) => {
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
