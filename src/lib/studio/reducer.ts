import type { EditMode } from "@/lib/ai/schemas"
import type { EditResponse, ClientPhoto, StudioPhase, StudioState } from "@/types"
import { clampTargetCount, MIN_CANDIDATE_PHOTOS, MAX_CANDIDATE_PHOTOS } from "@/lib/limits"
import { createSessionId } from "@/lib/utils/ids"

export function createInitialStudioState(): StudioState {
  return {
    phase: "empty",
    sessionId: createSessionId(),
    photos: [],
    mode: "photography",
    targetCount: 6,
    result: null,
    error: null,
    replacementTargetPhotoId: null,
    userModifiedSequence: false,
    userEditedPhotoIds: new Set(),
    uploadProgress: null,
  }
}

export type StudioAction =
  | { type: "RESET" }
  | { type: "SET_PHASE"; phase: StudioPhase }
  | { type: "SET_PHOTOS"; photos: ClientPhoto[] }
  | { type: "UPSERT_PHOTO"; photo: ClientPhoto }
  | { type: "REMOVE_PHOTO"; id: string }
  | { type: "CLEAR_PHOTOS" }
  | { type: "SET_MODE"; mode: EditMode }
  | { type: "SET_TARGET_COUNT"; targetCount: number }
  | { type: "SET_UPLOAD_PROGRESS"; done: number; total: number }
  | { type: "SET_RESULT"; result: EditResponse }
  | { type: "SET_ERROR"; error: string }
  | { type: "RETURN_TO_SHEET" }
  | { type: "REORDER_SEQUENCE"; photoIds: string[] }
  | {
      type: "REPLACE_IN_SEQUENCE"
      position: number
      newPhotoId: string
      markUserEdit?: boolean
    }
  | { type: "SET_REPLACEMENT_TARGET"; photoId: string | null }

function withClampedTarget(
  photos: ClientPhoto[],
  targetCount: number,
): number {
  return clampTargetCount(targetCount, photos.length)
}

function derivePhase(photos: ClientPhoto[]): StudioPhase {
  if (photos.length === 0) return "empty"
  if (photos.some((p) => p.uploadStatus === "processing")) return "preparing"
  if (
    photos.length >= MIN_CANDIDATE_PHOTOS &&
    photos.length <= MAX_CANDIDATE_PHOTOS &&
    photos.every(
      (p) => p.uploadStatus === "local" || p.uploadStatus === "uploaded",
    )
  ) {
    return "ready"
  }
  if (photos.some((p) => p.uploadStatus === "error")) return "ready"
  if (
    photos.length > 0 &&
    photos.every(
      (p) =>
        p.uploadStatus === "local" ||
        p.uploadStatus === "uploaded" ||
        p.uploadStatus === "error",
    )
  ) {
    return "ready"
  }
  return "preparing"
}
export function studioReducer(
  state: StudioState,
  action: StudioAction,
): StudioState {
  switch (action.type) {
    case "RESET":
      return createInitialStudioState()
    case "SET_PHASE":
      return { ...state, phase: action.phase, error: null }
    case "SET_PHOTOS": {
      const photos = action.photos
      return {
        ...state,
        photos,
        targetCount: withClampedTarget(photos, state.targetCount),
        phase: derivePhase(photos),
        result: null,
        error: null,
        userModifiedSequence: false,
        userEditedPhotoIds: new Set(),
        replacementTargetPhotoId: null,
      }
    }
    case "UPSERT_PHOTO": {
      const photos = state.photos.map((p) =>
        p.id === action.photo.id ? action.photo : p,
      )
      const exists = state.photos.some((p) => p.id === action.photo.id)
      const next = exists ? photos : [...state.photos, action.photo]
      return {
        ...state,
        photos: next,
        targetCount: withClampedTarget(next, state.targetCount),
        phase:
          state.phase === "uploading" ||
          state.phase === "analyzing" ||
          state.phase === "results"
            ? state.phase
            : derivePhase(next),
      }
    }
    case "REMOVE_PHOTO": {
      const removed = state.photos.find((p) => p.id === action.id)
      if (removed?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      const photos = state.photos.filter((p) => p.id !== action.id)
      return {
        ...state,
        photos,
        targetCount: withClampedTarget(photos, state.targetCount),
        phase: derivePhase(photos),
        result: null,
      }
    }
    case "CLEAR_PHOTOS":
      for (const photo of state.photos) {
        if (photo.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      }
      return {
        ...state,
        photos: [],
        targetCount: 6,
        phase: "empty",
        result: null,
        error: null,
        uploadProgress: null,
        userModifiedSequence: false,
        userEditedPhotoIds: new Set(),
        replacementTargetPhotoId: null,
      }
    case "SET_MODE":
      return { ...state, mode: action.mode }
    case "SET_TARGET_COUNT":
      return {
        ...state,
        targetCount: withClampedTarget(state.photos, action.targetCount),
      }
    case "SET_UPLOAD_PROGRESS":
      return {
        ...state,
        uploadProgress: { done: action.done, total: action.total },
      }
    case "SET_RESULT":
      return {
        ...state,
        phase: "results",
        result: action.result,
        error: null,
        uploadProgress: null,
        userModifiedSequence: false,
        userEditedPhotoIds: new Set(),
        replacementTargetPhotoId: null,
      }
    case "SET_ERROR":
      return {
        ...state,
        phase: "error",
        error: action.error,
        uploadProgress: null,
      }
    case "RETURN_TO_SHEET":
      return {
        ...state,
        phase: derivePhase(state.photos),
        result: null,
        error: null,
        replacementTargetPhotoId: null,
        userModifiedSequence: false,
        userEditedPhotoIds: new Set(),
      }
    case "REORDER_SEQUENCE": {
      if (!state.result) return state
      const byId = new Map(
        state.result.result.sequence.map((item) => [item.photoId, item]),
      )
      const sequence = action.photoIds.map((id, index) => {
        const existing = byId.get(id)!
        return {
          ...existing,
          position: index + 1,
          relationshipToPrevious:
            index === 0 ? null : existing.relationshipToPrevious,
        }
      })
      return {
        ...state,
        userModifiedSequence: true,
        userEditedPhotoIds: new Set([
          ...state.userEditedPhotoIds,
          ...action.photoIds,
        ]),
        result: {
          ...state.result,
          result: {
            ...state.result.result,
            sequence,
          },
        },
      }
    }
    case "REPLACE_IN_SEQUENCE": {
      if (!state.result) return state
      const sequence = state.result.result.sequence.map((item) => {
        if (item.position !== action.position) return item
        return {
          ...item,
          photoId: action.newPhotoId,
          reason: item.reason,
        }
      })
      const nextEdited = new Set(state.userEditedPhotoIds)
      if (action.markUserEdit !== false) {
        nextEdited.add(action.newPhotoId)
      }
      return {
        ...state,
        userModifiedSequence: true,
        userEditedPhotoIds: nextEdited,
        replacementTargetPhotoId: null,
        result: {
          ...state.result,
          result: {
            ...state.result.result,
            sequence,
            notableCuts: state.result.result.notableCuts.filter(
              (cut) => cut.photoId !== action.newPhotoId,
            ),
          },
        },
      }
    }
    case "SET_REPLACEMENT_TARGET":
      return { ...state, replacementTargetPhotoId: action.photoId }
    default:
      return state
  }
}
