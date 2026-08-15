import { describe, expect, it } from "vitest"
import { validateEditResult } from "@/lib/ai/validate-edit"
import type { EditResult } from "@/lib/ai/schemas"

const ids = Array.from({ length: 12 }, (_, i) => `p${String(i + 1).padStart(2, "0")}`)

function baseResult(overrides: Partial<EditResult> = {}): EditResult {
  return {
    version: 1,
    editSummary:
      "A coherent architectural sequence that moves from open city scale into quieter human detail before closing on atmosphere.",
    sequence: [
      {
        position: 1,
        photoId: "p01",
        role: "lead",
        reason:
          "Opens with the strongest establishing frame and immediate spatial clarity for the set.",
        relationshipToPrevious: null,
      },
      {
        position: 2,
        photoId: "p03",
        role: "establishing",
        reason:
          "Widens the place without repeating the lead, adding depth and color continuity.",
        relationshipToPrevious: "Scale opens while palette stays muted.",
      },
      {
        position: 3,
        photoId: "p05",
        role: "human-scale",
        reason:
          "Introduces human presence that changes pacing after the architectural openers.",
        relationshipToPrevious: "Moves from place to person.",
      },
      {
        position: 4,
        photoId: "p07",
        role: "detail",
        reason:
          "Tightens into texture and material so the middle of the set can breathe.",
        relationshipToPrevious: "Scale contracts into detail.",
      },
      {
        position: 5,
        photoId: "p09",
        role: "contrast",
        reason:
          "Provides tonal contrast that prevents the sequence from becoming monotonous.",
        relationshipToPrevious: "Contrast in density and light.",
      },
      {
        position: 6,
        photoId: "p11",
        role: "close",
        reason:
          "Closes on the most atmospheric frame without needing another establishing shot.",
        relationshipToPrevious: "Settles into atmosphere for the ending.",
      },
    ],
    notableCuts: [
      {
        photoId: "p02",
        reason:
          "Strong individually, but p01 already performs the establishing role with cleaner separation.",
        redundantWith: "p01",
      },
    ],
    setNotes: {
      strengths: ["Clear opening", "Good scale changes"],
      watchouts: ["Watch consecutive architecture"],
    },
    ...overrides,
  }
}

describe("validateEditResult", () => {
  it("accepts a valid 6-image edit", () => {
    const result = validateEditResult(baseResult(), {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(true)
  })

  it("rejects duplicate selected IDs", () => {
    const bad = baseResult()
    bad.sequence[1]!.photoId = "p01"
    const result = validateEditResult(bad, {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true)
    }
  })

  it("rejects hallucinated IDs", () => {
    const bad = baseResult()
    bad.sequence[0]!.photoId = "p99"
    const result = validateEditResult(bad, {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("hallucinated"))).toBe(true)
    }
  })

  it("rejects wrong sequence length", () => {
    const bad = baseResult()
    bad.sequence = bad.sequence.slice(0, 5)
    const result = validateEditResult(bad, {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(false)
  })

  it("rejects selected photos appearing in notable cuts", () => {
    const bad = baseResult()
    bad.notableCuts[0]!.photoId = "p01"
    const result = validateEditResult(bad, {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(false)
  })

  it("rejects invalid redundantWith", () => {
    const bad = baseResult()
    bad.notableCuts[0]!.redundantWith = "p02"
    const result = validateEditResult(bad, {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(false)
  })

  it("rejects wrong position numbering", () => {
    const bad = baseResult()
    bad.sequence[2]!.position = 9
    const result = validateEditResult(bad, {
      targetCount: 6,
      availablePhotoIds: ids,
    })
    expect(result.ok).toBe(false)
  })
})
