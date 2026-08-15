"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils/cn"

type Props = {
  message: string
  detail?: string
  children?: ReactNode
}

const ROTATING_LINES = [
  "Reading the full set at overview detail…",
  "Comparing close variants…",
  "Checking what would be redundant…",
  "Weighing opening and closing frames…",
  "Building sequence rhythm…",
  "Writing set-level reasons…",
  "Still working — this can take a little while…",
] as const

export function AnalysisState({ message, detail, children }: Props) {
  const [tick, setTick] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    const rotate = window.setInterval(() => {
      setTick((value) => value + 1)
    }, 3200)
    const clock = window.setInterval(() => {
      setElapsedSec((value) => value + 1)
    }, 1000)
    return () => {
      window.clearInterval(rotate)
      window.clearInterval(clock)
    }
  }, [])

  const rotatingLine = useMemo(
    () => ROTATING_LINES[tick % ROTATING_LINES.length]!,
    [tick],
  )

  const elapsedLabel =
    elapsedSec < 60
      ? `${elapsedSec}s`
      : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`

  return (
    <div
      className="relative min-h-[70vh] overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--darkroom)] text-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {children ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
        >
          <div className="max-h-full overflow-hidden blur-[2px]">{children}</div>
          <div className="absolute inset-0 bg-[var(--darkroom)]/75" />
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
        <p className="inline-flex items-center gap-2 rounded-sm border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          Working · {elapsedLabel}
        </p>

        <h2 className="mt-6 font-[family-name:var(--font-newsreader)] text-4xl text-white sm:text-5xl">
          Editing the set
        </h2>

        <p className="mt-3 text-sm font-medium uppercase tracking-[0.16em] text-white/70">
          {message}
        </p>

        <p
          key={rotatingLine}
          className="mt-5 max-w-md text-base leading-relaxed text-white/85 motion-safe:animate-[fadeSwap_0.45s_ease]"
        >
          {rotatingLine}
        </p>

        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--darkroom-muted)]">
          {detail ??
            "The editor starts with the full shoot and may inspect close calls in more detail. This is normal — not a freeze."}
        </p>

        <div className="mt-10 w-full max-w-md space-y-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-white/10"
            aria-hidden
          >
            <div className="edit-progress-bar h-full w-1/3 rounded-full bg-[var(--accent)]" />
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-white/45">
            <span>Please keep this tab open</span>
            <span className="tabular-nums">{elapsedLabel}</span>
          </div>
        </div>

        <ul className="mt-10 grid w-full max-w-md gap-2 text-left text-xs text-white/55 sm:grid-cols-3">
          {[
            "Overview pass",
            "Close-call checks",
            "Final sequence",
          ].map((step, index) => (
            <li
              key={step}
              className={cn(
                "rounded-sm border px-3 py-2",
                index === tick % 3
                  ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-white/10 bg-white/5",
              )}
            >
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
