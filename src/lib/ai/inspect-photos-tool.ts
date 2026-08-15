import { tool, type ToolOutputImage, type ToolOutputText } from "@openai/agents"
import {
  InspectPhotosInputSchema,
  type InspectionLogItem,
} from "@/lib/ai/schemas"
import type { EditorContext } from "@/types"

export const DEFAULT_INSPECTION_BUDGET = 8

export type InspectionBudgetError =
  | { code: "unknown_id"; photoId: string }
  | { code: "too_many_ids"; count: number }
  | { code: "budget_exceeded"; requested: number; remaining: number }

export function remainingInspectionBudget(ctx: EditorContext): number {
  return Math.max(0, ctx.inspectionBudget - ctx.inspectedIds.size)
}

export function applyInspectionRequest(
  ctx: EditorContext,
  photoIds: string[],
  reason: string,
): { ok: true; newlyInspected: string[] } | { ok: false; error: InspectionBudgetError } {
  if (photoIds.length < 1 || photoIds.length > 3) {
    return {
      ok: false,
      error: { code: "too_many_ids", count: photoIds.length },
    }
  }

  for (const id of photoIds) {
    if (!ctx.photos.has(id)) {
      return { ok: false, error: { code: "unknown_id", photoId: id } }
    }
  }

  const newlyInspected = photoIds.filter((id) => !ctx.inspectedIds.has(id))
  const remaining = remainingInspectionBudget(ctx)
  if (newlyInspected.length > remaining) {
    return {
      ok: false,
      error: {
        code: "budget_exceeded",
        requested: newlyInspected.length,
        remaining,
      },
    }
  }

  for (const id of newlyInspected) {
    ctx.inspectedIds.add(id)
  }

  const entry: InspectionLogItem = {
    callIndex: ctx.inspectionLog.length,
    photoIds: [...photoIds],
    reason,
  }
  ctx.inspectionLog.push(entry)

  return { ok: true, newlyInspected }
}

export function createInspectPhotosTool(ctx: EditorContext) {
  return tool({
    name: "inspect_photos",
    description:
      "Inspect 1–3 photographs at high visual detail when low-detail overview is insufficient for an editorial decision. Budget counts unique photo IDs.",
    parameters: InspectPhotosInputSchema,
    execute: async ({ photoIds, reason }) => {
      const applied = applyInspectionRequest(ctx, photoIds, reason)
      if (!applied.ok) {
        const err = applied.error
        if (err.code === "unknown_id") {
          return `Inspection failed: unknown photo ID ${err.photoId}.`
        }
        if (err.code === "too_many_ids") {
          return `Inspection failed: provide 1–3 photo IDs (received ${err.count}).`
        }
        return `Inspection failed: unique inspection budget exceeded (requested ${err.requested} new, remaining ${err.remaining}).`
      }

      const outputs: Array<ToolOutputText | ToolOutputImage> = [
        {
          type: "text",
          text: `HIGH DETAIL INSPECTION — ${photoIds.join(", ")}. Reason: ${reason}. Remaining unique budget: ${remainingInspectionBudget(ctx)}.`,
        },
      ]

      for (const id of photoIds) {
        const photo = ctx.photos.get(id)!
        outputs.push({
          type: "text",
          text: `HIGH DETAIL INSPECTION — ${id}`,
        })
        outputs.push({
          type: "image",
          image: photo.detailDataUrl ?? photo.dataUrl,
          detail: "high",
        })
      }

      return outputs
    },
  })
}
