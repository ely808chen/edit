"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import type { EditDebug } from "@/types"

type Props = {
  debug: EditDebug
}

function strategyLabel(strategy: EditDebug["strategy"]): string {
  switch (strategy) {
    case "adaptive":
      return "Adaptive inspection"
    case "low-only":
      return "Low-detail only"
    case "full-high":
      return "Full high-detail"
    default:
      return strategy
  }
}

export function EditorTrace({ debug }: Props) {
  const [open, setOpen] = useState(false)

  const inspectedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const entry of debug.inspectionLog) {
      for (const id of entry.photoIds) ids.add(id)
    }
    return Array.from(ids).sort()
  }, [debug.inspectionLog])

  const elapsedSeconds = (debug.durationMs / 1000).toFixed(1)

  return (
    <section className="border border-[var(--line)] bg-[var(--surface)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:px-5"
      >
        <span className="font-[family-name:var(--font-newsreader)] text-lg text-ink">
          How the editor looked at this set
        </span>
        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-[var(--muted)] transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="space-y-6 border-t border-[var(--line)] px-4 py-5 text-sm sm:px-5">
          <div className="space-y-1 text-[var(--muted)]">
            <p>
              {debug.totalPhotos} photos reviewed at overview detail
            </p>
            <p>
              {debug.uniquePhotosInspected} high-detail inspections used
              {debug.inspectionBudget
                ? ` (budget ${debug.inspectionBudget})`
                : ""}
            </p>
          </div>

          {inspectedIds.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Inspected
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {inspectedIds.map((id) => (
                  <li
                    key={id}
                    className="border border-[var(--line)] px-2 py-1 text-xs uppercase tracking-[0.12em] text-ink"
                  >
                    {id}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {debug.inspectionLog.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Inspection log
              </p>
              <ul className="space-y-3">
                {debug.inspectionLog.map((entry) => (
                  <li key={`${entry.callIndex}-${entry.photoIds.join("-")}`}>
                    <p className="font-medium uppercase tracking-[0.1em] text-ink">
                      {entry.photoIds
                        .map((id) => id.toUpperCase())
                        .join(" · ")}
                    </p>
                    <p className="mt-1 text-[var(--muted)]">{entry.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Model
              </dt>
              <dd className="mt-1 text-ink">{debug.model}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Strategy
              </dt>
              <dd className="mt-1 text-ink">{strategyLabel(debug.strategy)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Elapsed
              </dt>
              <dd className="mt-1 text-ink">{elapsedSeconds}s</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  )
}
