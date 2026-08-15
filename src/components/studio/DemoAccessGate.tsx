"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/Button"
import { APP_NAME, copy } from "@/lib/brand"
import { setClientDemoAccessCode } from "@/lib/access/demo-access"

type Props = {
  onUnlocked: () => void
}

export function DemoAccessGate({ onUnlocked }: Props) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError(copy.demoLocked)
      return
    }
    setClientDemoAccessCode(trimmed)
    setError(null)
    onUnlocked()
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8"
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
            {APP_NAME}
          </p>
          <h1 className="font-[family-name:var(--font-newsreader)] text-3xl text-ink">
            Enter access code
          </h1>
          <p className="text-sm text-[var(--muted)]">{copy.demoLocked}</p>
        </div>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Access code
          </span>
          <input
            type="password"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-sm border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
          />
        </label>

        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full">
          Unlock demo
        </Button>
      </form>
    </div>
  )
}
