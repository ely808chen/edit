"use client"

import { copy } from "@/lib/brand"

const BEATS = [
  {
    time: "9:40 pm",
    title: "The cull is done",
    body: "Blurry frames are gone. What’s left all deserve a second look — which is exactly the problem.",
  },
  {
    time: "10:15 pm",
    title: "You open a chat",
    body: "“Which is best for Instagram?” Then “what about 4 vs 11?” Then you lose track of what you already decided.",
  },
  {
    time: "11:20 pm",
    title: "Everything is still maybe",
    body: "Strong alone. Wrong together. Redundant. Quiet but necessary. You can feel it — you just can’t finish the edit.",
  },
] as const

export function FrustrationSection() {
  return (
    <section
      id="the-night"
      className="border-b border-[var(--line)] bg-[var(--surface)]"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
          {copy.frustrationLabel}
        </p>
        <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-newsreader)] text-3xl leading-tight text-ink sm:text-5xl">
          The shoot was great.
          <span className="block text-[var(--muted)]">
            The edit is where the night dies.
          </span>
        </h2>

        <div className="mt-12 grid gap-0 md:grid-cols-3">
          {BEATS.map((beat, index) => (
            <article
              key={beat.time}
              className="relative border-[var(--line)] px-0 py-6 md:border-l md:px-6 md:py-0 first:md:border-l-0 first:md:pl-0"
            >
              <p className="font-mono text-xs text-[var(--muted)]">
                {beat.time}
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-newsreader)] text-2xl text-ink">
                {beat.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                {beat.body}
              </p>
              {index < BEATS.length - 1 ? (
                <div
                  aria-hidden
                  className="absolute -bottom-3 left-0 text-[var(--line)] md:hidden"
                >
                  ↓
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
