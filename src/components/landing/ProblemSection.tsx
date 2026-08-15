"use client"

export function ProblemSection() {
  const columns = [
    {
      title: "Individual quality is not enough",
      body: "A strong photograph can still be redundant once the set has a better version of the same idea.",
    },
    {
      title: "The set changes the decision",
      body: "A quieter frame can earn its place by fixing pacing, contrast, or the ending — even if it would lose a beauty contest.",
    },
    {
      title: "Your corrections matter",
      body: "When you replace the editor’s choice, that pairwise decision becomes preference data for later edits — not a personality quiz.",
    },
  ] as const

  return (
    <section id="why-sets" className="border-b border-[var(--line)]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-3xl font-[family-name:var(--font-newsreader)] text-3xl leading-tight text-ink sm:text-4xl">
          All of these are good. Only a few belong together.
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="space-y-3">
              <h3 className="font-[family-name:var(--font-newsreader)] text-xl text-ink">
                {column.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {column.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
