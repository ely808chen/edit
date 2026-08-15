"use client"

import { cn } from "@/lib/utils/cn"

type Option<T extends string> = {
  value: T
  label: string
  description?: string
}

type Props<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: Props<T>) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          {label}
        </p>
      ) : null}
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2 sm:grid-cols-2"
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-sm border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                selected
                  ? "border-ink bg-ink text-[var(--background)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-ink hover:border-ink/40",
              )}
            >
              <div className="text-sm font-medium">{option.label}</div>
              {option.description ? (
                <div
                  className={cn(
                    "mt-1 text-xs leading-relaxed",
                    selected ? "text-white/70" : "text-[var(--muted)]",
                  )}
                >
                  {option.description}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
