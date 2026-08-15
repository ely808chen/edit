import {
  Agent,
  run,
  user,
  type AgentInputItem,
} from "@openai/agents"
import { EDITOR_SYSTEM_PROMPT } from "@/lib/ai/editor-prompt"
import {
  createInspectPhotosTool,
  DEFAULT_INSPECTION_BUDGET,
} from "@/lib/ai/inspect-photos-tool"
import {
  EditResultSchema,
  type EditMode,
  type EditResult,
  type PreferenceEventPayload,
} from "@/lib/ai/schemas"
import { validateEditResult } from "@/lib/ai/validate-edit"
import type {
  EditDebug,
  EditStrategy,
  EditorContext,
  EditorPhoto,
} from "@/types"

type UserContentPart = Parameters<typeof user>[0] extends string
  ? never
  : Exclude<Parameters<typeof user>[0], string>[number]

export type RunEditorInput = {
  photos: EditorPhoto[]
  mode: EditMode
  targetCount: number
  strategy?: EditStrategy
  preferenceEvents?: PreferenceEventPayload[]
  model?: string
  inspectionBudget?: number
}

export type RunEditorSuccess = {
  ok: true
  result: EditResult
  debug: EditDebug
}

export type RunEditorFailure = {
  ok: false
  error: string
  debug: EditDebug
}

export type RunEditorOutput = RunEditorSuccess | RunEditorFailure

function getModelName(explicit?: string): string {
  return (
    explicit?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5.6-terra"
  )
}

function buildTaskContextText(input: {
  mode: EditMode
  targetCount: number
  photoCount: number
  inspectionBudget: number
  strategy: EditStrategy
}): string {
  return [
    "TASK CONTEXT",
    `mode: ${input.mode}`,
    `targetCount: ${input.targetCount}`,
    `numberOfPhotographs: ${input.photoCount}`,
    `inspectionBudget: ${input.inspectionBudget}`,
    `strategy: ${input.strategy}`,
    "",
    "Return a structured EditResult with EXACTLY the requested number of photographs.",
    "Evaluate every photograph relative to the whole set.",
  ].join("\n")
}

function preferenceContents(
  events: PreferenceEventPayload[],
): UserContentPart[] {
  const contents: UserContentPart[] = []
  for (const event of events.slice(0, 3)) {
    contents.push({
      type: "input_text",
      text: [
        "PAST USER PREFERENCE EXAMPLE",
        `Context: ${event.mode === "instagram" ? "Instagram carousel" : "Photography set"}`,
        `Position: ${event.position}`,
        `Role: ${event.role}`,
        "Treat this as one observed preference event, not as a universal rule.",
        "Current-set quality takes priority.",
      ].join("\n"),
    })
    contents.push({
      type: "input_text",
      text: "AI originally selected:",
    })
    contents.push({
      type: "input_image",
      image: event.aiSelected.thumbnailDataUrl,
      detail: "low",
    })
    contents.push({
      type: "input_text",
      text: "User replaced it with:",
    })
    contents.push({
      type: "input_image",
      image: event.userPreferred.thumbnailDataUrl,
      detail: "low",
    })
  }
  return contents
}

function buildInitialInput(
  ctx: EditorContext,
  strategy: EditStrategy,
  preferenceEvents: PreferenceEventPayload[],
): AgentInputItem[] {
  const detail = strategy === "full-high" ? "high" : "low"
  const contents: UserContentPart[] = [
    {
      type: "input_text",
      text: buildTaskContextText({
        mode: ctx.mode,
        targetCount: ctx.targetCount,
        photoCount: ctx.photos.size,
        inspectionBudget:
          strategy === "adaptive" ? ctx.inspectionBudget : 0,
        strategy,
      }),
    },
    ...preferenceContents(preferenceEvents),
  ]

  const ordered = [...ctx.photos.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )

  for (const photo of ordered) {
    contents.push({
      type: "input_text",
      text: `PHOTO ${photo.id} (${photo.width}×${photo.height})`,
    })
    contents.push({
      type: "input_image",
      image: photo.dataUrl,
      detail,
    })
  }

  return [user(contents)]
}

function createEditorContext(
  photos: EditorPhoto[],
  mode: EditMode,
  targetCount: number,
  inspectionBudget: number,
): EditorContext {
  return {
    photos: new Map(photos.map((p) => [p.id, p])),
    inspectionBudget,
    inspectedIds: new Set(),
    inspectionLog: [],
    mode,
    targetCount,
  }
}

function extractUsage(result: {
  state?: { usage?: { inputTokens?: number; outputTokens?: number } }
  runContext?: { usage?: { inputTokens?: number; outputTokens?: number } }
}): EditDebug["usage"] | undefined {
  const usage = result.state?.usage ?? result.runContext?.usage
  if (!usage) return undefined
  const inputTokens =
    typeof usage.inputTokens === "number" ? usage.inputTokens : undefined
  const outputTokens =
    typeof usage.outputTokens === "number" ? usage.outputTokens : undefined
  if (inputTokens == null && outputTokens == null) return undefined
  return { inputTokens, outputTokens }
}

async function runOnce(params: {
  ctx: EditorContext
  strategy: EditStrategy
  preferenceEvents: PreferenceEventPayload[]
  model: string
  correctionMessage?: string
}): Promise<{
  output: EditResult | undefined
  usage?: EditDebug["usage"]
}> {
  const { ctx, strategy, preferenceEvents, model, correctionMessage } =
    params

  const tools =
    strategy === "adaptive" ? [createInspectPhotosTool(ctx)] : []

  const agent = new Agent({
    name: "Editor",
    instructions: EDITOR_SYSTEM_PROMPT,
    model,
    outputType: EditResultSchema,
    tools,
    modelSettings: {
      reasoning: { effort: "medium" },
    },
  })

  const input: AgentInputItem[] = [
    ...buildInitialInput(ctx, strategy, preferenceEvents),
  ]

  if (correctionMessage) {
    input.push(user(correctionMessage))
  }

  const result = await run(agent, input, { context: ctx, maxTurns: 12 })
  const output = result.finalOutput as EditResult | undefined
  return { output, usage: extractUsage(result) }
}

export async function runEditor(
  input: RunEditorInput,
): Promise<RunEditorOutput> {
  const started = Date.now()
  const strategy = input.strategy ?? "adaptive"
  const model = getModelName(input.model)
  const inspectionBudget =
    strategy === "adaptive"
      ? (input.inspectionBudget ?? DEFAULT_INSPECTION_BUDGET)
      : 0

  const ctx = createEditorContext(
    input.photos,
    input.mode,
    input.targetCount,
    inspectionBudget,
  )

  const preferenceEvents = input.preferenceEvents?.slice(0, 3) ?? []
  const availablePhotoIds = input.photos.map((p) => p.id)

  let usage: EditDebug["usage"] | undefined
  let lastError = "The editor returned an incomplete sequence."

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Fresh inspection state per attempt for adaptive strategy
      if (attempt > 0 && strategy === "adaptive") {
        ctx.inspectedIds.clear()
        ctx.inspectionLog.length = 0
      }

      const { output, usage: attemptUsage } = await runOnce({
        ctx,
        strategy,
        preferenceEvents,
        model,
        correctionMessage:
          attempt === 0
            ? undefined
            : lastError.startsWith("Your previous")
              ? lastError
              : undefined,
      })

      if (attemptUsage) usage = attemptUsage

      if (!output) {
        lastError =
          "Your previous structured edit failed validation.\n- missing final structured EditResult\nReturn a complete EditResult now."
        continue
      }

      const validated = validateEditResult(output, {
        targetCount: input.targetCount,
        availablePhotoIds,
      })

      if (validated.ok) {
        return {
          ok: true,
          result: validated.result,
          debug: {
            strategy,
            model,
            totalPhotos: input.photos.length,
            inspectionBudget,
            uniquePhotosInspected: ctx.inspectedIds.size,
            inspectionLog: [...ctx.inspectionLog],
            durationMs: Date.now() - started,
            usage,
          },
        }
      }

      lastError = validated.correctionMessage
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "The editor could not complete this set."
      break
    }
  }

  return {
    ok: false,
    error: lastError.includes("validation")
      ? "The editor returned an incomplete sequence. Try this edit again."
      : lastError,
    debug: {
      strategy,
      model,
      totalPhotos: input.photos.length,
      inspectionBudget,
      uniquePhotosInspected: ctx.inspectedIds.size,
      inspectionLog: [...ctx.inspectionLog],
      durationMs: Date.now() - started,
      usage,
    },
  }
}
