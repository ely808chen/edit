"use client"

import Link from "next/link"
import { copy } from "@/lib/brand"
import { cn } from "@/lib/utils/cn"

const ctaClass =
  "inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-5 py-3 text-sm font-medium tracking-wide text-[var(--background)] transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"

export function SatisfactionSection() {
  return (
    <section
      id="how-it-works"
      className="border-b border-[var(--line)] bg-[var(--background)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          {copy.satisfactionLabel}
        </p>
        <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-newsreader)] text-3xl leading-tight text-ink sm:text-5xl">
          A finished sequence.
          <span className="block">Reasons that talk about the set.</span>
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
          EDIT. looks at the whole shoot, makes the close calls, and hands you
          an ordered edit you can trust enough to argue with — by dragging and
          swapping, not by starting another chat.
        </p>

        <div className="mt-12 overflow-hidden border border-[var(--line)] bg-[var(--darkroom)] text-white">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                The edit · 6 photos
              </p>
              <p className="mt-4 font-[family-name:var(--font-newsreader)] text-2xl leading-snug text-white/95">
                Architecture into human scale, then a quieter close — without
                repeating the same wide frame twice.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/65">
                <li>Lead chosen for the set, not the loudest single frame</li>
                <li>Cuts explained against what stayed</li>
                <li>Your swaps remembered as preference signals</li>
              </ul>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {["Lead", "Place", "Human", "Detail", "Contrast", "Close"].map(
                  (role, index) => (
                    <div key={role} className="space-y-2">
                      <div
                        className="aspect-[3/4] ring-1 ring-[var(--accent)]/35"
                        style={{
                          background: `linear-gradient(${150 + index * 18}deg, #3a3a36, #121210)`,
                        }}
                      />
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/45">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-white/80">
                        {role}
                      </p>
                    </div>
                  ),
                )}
              </div>
              <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/55">
                “P12 is strong individually, but P07 already makes the same
                visual point with cleaner separation.”
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/studio" className={cn(ctaClass)}>
            Start with your candidates →
          </Link>
          <p className="text-sm text-[var(--muted)]">{copy.promise}</p>
        </div>
      </div>
    </section>
  )
}
