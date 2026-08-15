"use client"

import type { ReactNode } from "react"

type Props = {
  message: string
  detail?: string
  children?: ReactNode
}

export function AnalysisState({ message, detail, children }: Props) {
  return (
    <div className="relative overflow-hidden">
      {children ? (
        <div
          aria-hidden
          className="pointer-events-none max-h-[42vh] overflow-hidden opacity-35 blur-[1px] sm:max-h-[48vh]"
        >
          {children}
        </div>
      ) : null}

      <div
        className={
          children
            ? "absolute inset-0 flex items-center justify-center bg-[var(--background)]/55 px-6"
            : "flex min-h-[40vh] items-center justify-center px-6 py-16"
        }
      >
        <div className="max-w-lg text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {message}
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-newsreader)] text-3xl text-ink sm:text-4xl">
            Editing the set
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
            {detail ??
              "The editor starts with the full shoot and may inspect close calls in more detail"}
          </p>
          <div
            className="mx-auto mt-8 h-px w-16 animate-pulse bg-[var(--accent)]"
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
