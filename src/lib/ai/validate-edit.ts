import type { EditResult } from "@/lib/ai/schemas"

export type ValidateEditOptions = {
  targetCount: number
  availablePhotoIds: string[]
}

export type ValidateEditSuccess = {
  ok: true
  result: EditResult
}

export type ValidateEditFailure = {
  ok: false
  errors: string[]
  correctionMessage: string
}

export type ValidateEditResult = ValidateEditSuccess | ValidateEditFailure

export function validateEditResult(
  result: EditResult,
  options: ValidateEditOptions,
): ValidateEditResult {
  const errors: string[] = []
  const available = new Set(options.availablePhotoIds)
  const { targetCount } = options

  if (result.sequence.length !== targetCount) {
    errors.push(
      `sequence length is ${result.sequence.length}, expected ${targetCount}`,
    )
  }

  const selectedIds = result.sequence.map((item) => item.photoId)
  const uniqueSelected = new Set(selectedIds)
  if (uniqueSelected.size !== selectedIds.length) {
    errors.push("sequence contains duplicate photo IDs")
  }

  const positions = result.sequence.map((item) => item.position)
  const uniquePositions = new Set(positions)
  if (uniquePositions.size !== positions.length) {
    errors.push("sequence contains duplicate positions")
  }

  for (let i = 1; i <= targetCount; i++) {
    if (!uniquePositions.has(i)) {
      errors.push(`missing position ${i}`)
    }
  }

  for (const item of result.sequence) {
    if (!available.has(item.photoId)) {
      errors.push(`hallucinated sequence photo ID: ${item.photoId}`)
    }
  }

  if (result.sequence[0] && result.sequence[0].relationshipToPrevious !== null) {
    errors.push("first sequence item must have relationshipToPrevious = null")
  }

  const selectedSet = new Set(selectedIds)
  for (const cut of result.notableCuts) {
    if (!available.has(cut.photoId)) {
      errors.push(`hallucinated notable cut photo ID: ${cut.photoId}`)
    }
    if (selectedSet.has(cut.photoId)) {
      errors.push(
        `photo ${cut.photoId} appears in both sequence and notableCuts`,
      )
    }
    if (cut.redundantWith != null) {
      if (!available.has(cut.redundantWith)) {
        errors.push(
          `notable cut ${cut.photoId} references unknown redundantWith ${cut.redundantWith}`,
        )
      } else if (!selectedSet.has(cut.redundantWith)) {
        errors.push(
          `notable cut ${cut.photoId} redundantWith must reference a selected photo`,
        )
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      correctionMessage: [
        "Your previous structured edit failed validation.",
        "Fix ONLY these structural issues and return a corrected EditResult:",
        ...errors.map((e) => `- ${e}`),
        `Return exactly ${targetCount} unique selected photo IDs from the provided set.`,
        "Do not invent photo IDs.",
      ].join("\n"),
    }
  }

  const normalized: EditResult = {
    ...result,
    sequence: [...result.sequence].sort((a, b) => a.position - b.position),
  }

  return { ok: true, result: normalized }
}
