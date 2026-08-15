"use client"

import Link from "next/link"
import { APP_NAME, copy } from "@/lib/brand"
import { cn } from "@/lib/utils/cn"

const SAMPLE_ROLES = [
  "Lead",
  "Human scale",
  "Detail",
  "Transition",
  "Anchor",
  "Close",
] as const

const ctaClass =
  "inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-sm font-medium tracking-wide text-[var(--background)] transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(215,255,67,0.12),_transparent_55%),linear-gradient(180deg,_rgba(11,11,11,0.03),_transparent_40%)]"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div className="space-y-6">
          <p className="text-sm font-medium tracking-[0.12em] text-ink">
            {APP_NAME}
          </p>
          <h1 className="max-w-xl font-[family-name:var(--font-newsreader)] text-4xl leading-[1.12] text-ink sm:text-5xl lg:text-[3.35rem]">
            {copy.heroHeadline}
          </h1>
          <p className="max-w-lg font-[family-name:var(--font-newsreader)] text-2xl leading-snug text-ink/90 sm:text-3xl">
            {copy.promise}
          </p>
          <p className="max-w-md text-base leading-relaxed text-[var(--muted)]">
            {copy.heroBody}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/studio" className={cn(ctaClass)}>
              Start an edit →
            </Link>
            <a
              href="#how-it-works"
              className="text-sm text-ink underline-offset-4 hover:underline"
            >
              See how it works
            </a>
          </div>
        </div>

        <div
          aria-hidden
          className="rounded-sm border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Contact sheet → sequence
          </p>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {Array.from({ length: 20 }, (_, i) => {
              const selected = [2, 5, 8, 11, 14, 18].includes(i)
              return (
                <div
                  key={i}
                  className={
                    selected
                      ? "aspect-square bg-[var(--darkroom)] ring-2 ring-[var(--accent)]"
                      : "aspect-square bg-[var(--line)]/80"
                  }
                  style={{
                    opacity: selected ? 1 : 0.55 + ((i % 5) * 0.06),
                  }}
                />
              )
            })}
          </div>
          <div className="mt-5 flex items-center justify-center text-[var(--muted)]">
            ↓
          </div>
          <div className="mt-4 grid grid-cols-6 gap-2">
            {SAMPLE_ROLES.map((role, index) => (
              <div key={role} className="space-y-1.5">
                <div className="aspect-[3/4] bg-[var(--darkroom)]" />
                <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="text-[9px] uppercase tracking-[0.1em] text-ink">
                  {role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
