import type {
  EditMode,
  EditResult,
  InspectionLogItem,
  PreferenceEventPayload,
} from "@/lib/ai/schemas"

export type ClientPhoto = {
  id: string
  file: File
  previewUrl: string
  thumbnailDataUrl: string
  width: number
  height: number
  processedBlob?: Blob
  uploadedPathname?: string
  uploadStatus:
    | "local"
    | "processing"
    | "uploading"
    | "uploaded"
    | "error"
  errorMessage?: string
}

export type StudioPhase =
  | "empty"
  | "preparing"
  | "ready"
  | "uploading"
  | "analyzing"
  | "results"
  | "error"

export type EditStrategy = "adaptive" | "low-only" | "full-high"

export type EditDebug = {
  strategy: EditStrategy
  model: string
  totalPhotos: number
  inspectionBudget: number
  uniquePhotosInspected: number
  inspectionLog: InspectionLogItem[]
  durationMs: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
}

export type EditResponse = {
  result: EditResult
  debug: EditDebug
}

export type PreferenceEvent = PreferenceEventPayload

export type StudioState = {
  phase: StudioPhase
  sessionId: string
  photos: ClientPhoto[]
  mode: EditMode
  targetCount: number
  result: EditResponse | null
  error: string | null
  replacementTargetPhotoId: string | null
  userModifiedSequence: boolean
  userEditedPhotoIds: Set<string>
  uploadProgress: { done: number; total: number } | null
}

export type EditorPhoto = {
  id: string
  dataUrl: string
  width: number
  height: number
  filename?: string
}

export type EditorContext = {
  photos: Map<string, EditorPhoto>
  inspectionBudget: number
  inspectedIds: Set<string>
  inspectionLog: InspectionLogItem[]
  mode: EditMode
  targetCount: number
}
