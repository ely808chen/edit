import Link from "next/link"
import { DifferenceSection } from "@/components/landing/DifferenceSection"
import { FrustrationSection } from "@/components/landing/FrustrationSection"
import { Hero } from "@/components/landing/Hero"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { SatisfactionSection } from "@/components/landing/SatisfactionSection"
import { APP_NAME, copy } from "@/lib/brand"

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--darkroom)]/90 text-white backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.14em] text-white"
          >
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-white/60 sm:gap-6">
            <a href="#the-night" className="hover:text-white">
              The night
            </a>
            <a
              href="#how-it-works"
              className="hidden hover:text-white sm:inline"
            >
              The edit
            </a>
            <Link
              href="/studio"
              className="rounded-sm bg-[var(--accent)] px-3 py-2 font-medium text-ink transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Open editor →
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
        <FrustrationSection />
        <SatisfactionSection />
        <ProblemSection />
        <DifferenceSection />
      </main>

      <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 text-sm text-[var(--muted)] sm:px-6">
          <p>Built as an experiment in set-level multimodal reasoning</p>
          <p>{copy.privacy}</p>
          <p className="text-xs">
            Working copies are deleted from temporary storage after an edit
            finishes. Image data is still sent to the model provider during
            analysis.
          </p>
        </div>
      </footer>
    </div>
  )
}
