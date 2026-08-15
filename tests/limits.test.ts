import { describe, expect, it } from "vitest"
import {
  availableTargetCounts,
  clampTargetCount,
  maxTargetForPhotoCount,
} from "@/lib/limits"

describe("target count limits", () => {
  it("caps upper bound by uploaded photo count", () => {
    expect(maxTargetForPhotoCount(5)).toBe(5)
    expect(availableTargetCounts(5)).toEqual([1, 2, 3, 4, 5])
  })

  it("never exceeds 20", () => {
    expect(maxTargetForPhotoCount(40)).toBe(20)
    expect(availableTargetCounts(20)).toHaveLength(20)
  })

  it("clamps selected target when photos shrink", () => {
    expect(clampTargetCount(8, 5)).toBe(5)
    expect(clampTargetCount(1, 5)).toBe(1)
    expect(clampTargetCount(0, 5)).toBe(1)
  })
})
