"use client"

import Link from "next/link"
import { copy } from "@/lib/brand"
import { cn } from "@/lib/utils/cn"

const ctaClass =
  "inline-flex items-center justify-center gap-2 rounded-sm bg-[var(--accent)] px-5 py-3 text-sm font-semibold tracking-wide text-ink transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"

const CHAOS_LABELS = [
  "3 or 7?",
  "Same corner…",
  "Keep both?",
  "Which opener?",
  "Too similar",
  "Maybe later",
]

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--darkroom)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(215,255,67,0.16), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(255,255,255,0.06), transparent 50%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 3px)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pb-24 lg:pt-20">
        <div className="space-y-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
            {copy.heroEyebrow}
          </p>
          <h1 className="max-w-xl font-[family-name:var(--font-newsreader)] text-[2.35rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            <span className="block text-white/90">{copy.heroHeadline}</span>
            <span className="mt-2 block text-[var(--accent)]">
              {copy.heroHeadlineAccent}
            </span>
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[var(--darkroom-muted)] sm:text-lg">
            {copy.heroBody}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Link href="/studio" className={cn(ctaClass)}>
              Open the editor →
            </Link>
            <a
              href="#the-night"
              className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            >
              Sound familiar?
            </a>
          </div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/40">
            {copy.tagline}
          </p>
        </div>

        <div className="relative" aria-hidden>
          <div className="rounded-sm border border-white/10 bg-[var(--darkroom-surface)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--darkroom-muted)]">
                11:48 pm · after the trip
              </p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                Still undecided
              </p>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {Array.from({ length: 20 }, (_, i) => {
                const hot = [1, 4, 7, 9, 12, 15].includes(i)
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative aspect-[4/5] overflow-hidden",
                      hot ? "ring-1 ring-[var(--accent)]" : "opacity-55",
                    )}
                    style={{
                      background: `linear-gradient(${140 + i * 7}deg, #2a2a28 0%, #121210 55%, #3a3832 ${70 + (i % 4) * 5}%)`,
                    }}
                  >
                    {hot ? (
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[8px] uppercase tracking-[0.08em] text-[var(--accent)]">
                        ?
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CHAOS_LABELS.map((label) => (
                <span
                  key={label}
                  className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white/65"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--darkroom-muted)]">
                What EDIT. returns instead
              </p>
              <div className="mt-3 flex gap-2 overflow-hidden">
                {["Lead", "Scale", "Human", "Detail", "Breath", "Close"].map(
                  (role, index) => (
                    <div key={role} className="min-w-0 flex-1 space-y-1.5">
                      <div
                        className="aspect-[3/4] bg-[#1c1c1a] ring-1 ring-[var(--accent)]/40"
                        style={{
                          backgroundImage: `linear-gradient(${160 + index * 12}deg, #333 0%, #111 100%)`,
                        }}
                      />
                      <p className="truncate text-[9px] uppercase tracking-[0.12em] text-white/55">
                        {String(index + 1).padStart(2, "0")} · {role}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
