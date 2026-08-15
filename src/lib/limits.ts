/** Product limits for candidate sets and final edit size. */
export const MIN_CANDIDATE_PHOTOS = 2
export const MAX_CANDIDATE_PHOTOS = 20
export const MIN_TARGET_COUNT = 1
export const MAX_TARGET_COUNT = 20

export function maxTargetForPhotoCount(photoCount: number): number {
  return Math.max(
    MIN_TARGET_COUNT,
    Math.min(MAX_TARGET_COUNT, Math.max(0, photoCount)),
  )
}

export function clampTargetCount(
  targetCount: number,
  photoCount: number,
): number {
  const max = maxTargetForPhotoCount(photoCount)
  if (photoCount < MIN_TARGET_COUNT) return MIN_TARGET_COUNT
  return Math.min(Math.max(MIN_TARGET_COUNT, targetCount), max)
}

export function availableTargetCounts(photoCount: number): number[] {
  const max = maxTargetForPhotoCount(photoCount)
  if (max < MIN_TARGET_COUNT) return []
  return Array.from({ length: max }, (_, i) => i + 1)
}
