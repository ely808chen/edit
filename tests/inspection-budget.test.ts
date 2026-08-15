import { describe, expect, it } from "vitest"
import {
  applyInspectionRequest,
  remainingInspectionBudget,
} from "@/lib/ai/inspect-photos-tool"
import type { EditorContext } from "@/types"

function makeCtx(budget = 8): EditorContext {
  const photos = new Map(
    Array.from({ length: 12 }, (_, i) => {
      const id = `p${String(i + 1).padStart(2, "0")}`
      return [
        id,
        {
          id,
          dataUrl: `data:image/jpeg;base64,${id}`,
          width: 100,
          height: 100,
        },
      ] as const
    }),
  )
  return {
    photos,
    inspectionBudget: budget,
    inspectedIds: new Set(),
    inspectionLog: [],
    mode: "photography",
    targetCount: 6,
  }
}

describe("inspection budget", () => {
  it("consumes unique IDs", () => {
    const ctx = makeCtx()
    const first = applyInspectionRequest(ctx, ["p01", "p02"], "Close variants need comparison")
    expect(first.ok).toBe(true)
    expect(ctx.inspectedIds.size).toBe(2)
    expect(remainingInspectionBudget(ctx)).toBe(6)
  })

  it("does not consume budget for repeat IDs", () => {
    const ctx = makeCtx()
    applyInspectionRequest(ctx, ["p01"], "First look at potential lead frame")
    const second = applyInspectionRequest(
      ctx,
      ["p01"],
      "Re-check after comparing alternatives",
    )
    expect(second.ok).toBe(true)
    expect(ctx.inspectedIds.size).toBe(1)
    expect(remainingInspectionBudget(ctx)).toBe(7)
  })

  it("fails on unknown ID", () => {
    const ctx = makeCtx()
    const result = applyInspectionRequest(
      ctx,
      ["p99"],
      "Checking an unknown candidate carefully",
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("unknown_id")
  })

  it("fails when more than 3 IDs are requested", () => {
    const ctx = makeCtx()
    const result = applyInspectionRequest(
      ctx,
      ["p01", "p02", "p03", "p04"],
      "Too many IDs in one inspection call",
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("too_many_ids")
  })

  it("fails cleanly when budget is exceeded", () => {
    const ctx = makeCtx(2)
    applyInspectionRequest(ctx, ["p01", "p02"], "Use remaining budget first")
    const result = applyInspectionRequest(
      ctx,
      ["p03"],
      "One more unique inspection after budget used",
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("budget_exceeded")
  })
})
