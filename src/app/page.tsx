import Link from "next/link"
import { DifferenceSection } from "@/components/landing/DifferenceSection"
import { Hero } from "@/components/landing/Hero"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { APP_NAME, copy } from "@/lib/brand"

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--background)_92%,white)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.14em] text-ink"
          >
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-[var(--muted)] sm:gap-6">
            <a href="#how-it-works" className="hover:text-ink">
              How it works
            </a>
            <a
              href="#why-sets"
              className="hidden hover:text-ink sm:inline"
            >
              Why sets matter
            </a>
            <Link
              href="/studio"
              className="rounded-sm bg-ink px-3 py-2 text-[var(--background)] transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Open editor →
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Hero />
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
