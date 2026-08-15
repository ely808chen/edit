import { z } from "zod"

export const EditModeSchema = z.enum(["photography", "instagram"])

export const EditRoleSchema = z.enum([
  "lead",
  "establishing",
  "human-scale",
  "detail",
  "anchor",
  "contrast",
  "transition",
  "rhythm",
  "close",
])

export const SequenceItemSchema = z.object({
  position: z.number().int().min(1).max(8),
  photoId: z.string(),
  role: EditRoleSchema,
  reason: z.string().min(20).max(360),
  relationshipToPrevious: z.string().max(280).nullable(),
})

export const NotableCutSchema = z.object({
  photoId: z.string(),
  reason: z.string().min(20).max(360),
  redundantWith: z.string().nullable(),
})

export const EditResultSchema = z.object({
  version: z.literal(1),
  editSummary: z.string().min(40).max(500),
  sequence: z.array(SequenceItemSchema).min(4).max(8),
  notableCuts: z.array(NotableCutSchema).max(8),
  setNotes: z.object({
    strengths: z.array(z.string()).max(4),
    watchouts: z.array(z.string()).max(4),
  }),
})

export type EditMode = z.infer<typeof EditModeSchema>
export type EditRole = z.infer<typeof EditRoleSchema>
export type SequenceItem = z.infer<typeof SequenceItemSchema>
export type NotableCut = z.infer<typeof NotableCutSchema>
export type EditResult = z.infer<typeof EditResultSchema>

export const InspectPhotosInputSchema = z.object({
  photoIds: z.array(z.string()).min(1).max(3),
  reason: z.string().min(10).max(220),
})

export type InspectPhotosInput = z.infer<typeof InspectPhotosInputSchema>

export const PreferenceEventPayloadSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  mode: EditModeSchema,
  position: z.number().int().min(1).max(8),
  role: z.string(),
  aiSelected: z.object({
    thumbnailDataUrl: z.string(),
    reason: z.string().optional(),
  }),
  userPreferred: z.object({
    thumbnailDataUrl: z.string(),
  }),
})

export type PreferenceEventPayload = z.infer<
  typeof PreferenceEventPayloadSchema
>

export const EditRequestSchema = z.object({
  sessionId: z.string().min(8).max(128),
  mode: EditModeSchema,
  targetCount: z.number().int().min(4).max(8),
  photos: z
    .array(
      z.object({
        id: z.string().regex(/^p\d{2}$/),
        pathname: z.string().min(1),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
    )
    .min(12)
    .max(20),
  preferences: z.array(PreferenceEventPayloadSchema).max(3).optional(),
  strategy: z.literal("adaptive").optional(),
})

export type EditRequest = z.infer<typeof EditRequestSchema>

export const InspectionLogItemSchema = z.object({
  callIndex: z.number().int().min(0),
  photoIds: z.array(z.string()),
  reason: z.string(),
})

export type InspectionLogItem = z.infer<typeof InspectionLogItemSchema>
