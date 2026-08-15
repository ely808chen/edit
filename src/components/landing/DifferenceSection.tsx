"use client"

import Link from "next/link"
import { cn } from "@/lib/utils/cn"

const ctaClass =
  "inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-sm font-medium tracking-wide text-[var(--background)] transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"

export function DifferenceSection() {
  return (
    <section id="why-sets" className="border-b border-[var(--line)]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-[family-name:var(--font-newsreader)] text-3xl text-ink sm:text-4xl">
          Not a score
        </h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Not this
            </p>
            <ul className="mt-6 space-y-3 font-mono text-sm text-[var(--muted)]">
              <li className="flex justify-between gap-4">
                <span>Photo 03</span>
                <span>91</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Photo 07</span>
                <span>88</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Photo 12</span>
                <span>86</span>
              </li>
            </ul>
          </div>

          <div className="border border-ink bg-[var(--darkroom)] p-5 text-white sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
              This
            </p>
            <p className="mt-6 max-w-md font-[family-name:var(--font-newsreader)] text-xl leading-snug sm:text-2xl">
              p12 is strong individually, but p07 already makes the same visual
              point with cleaner separation
            </p>
            <div className="mt-8 space-y-2 text-sm uppercase tracking-[0.14em]">
              <p>→ Keep p07</p>
              <p className="text-white/60">→ Cut p12</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <Link href="/studio" className={cn(ctaClass)}>
            Start an edit →
          </Link>
        </div>
      </div>
    </section>
  )
}
