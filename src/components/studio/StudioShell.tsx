"use client"

import Link from "next/link"
import {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import { ArrowLeft } from "lucide-react"
import { upload } from "@vercel/blob/client"
import { AnalysisState } from "@/components/studio/AnalysisState"
import { ContactSheet } from "@/components/studio/ContactSheet"
import { DemoAccessGate } from "@/components/studio/DemoAccessGate"
import { EditResultView } from "@/components/studio/EditResultView"
import { EditSettings } from "@/components/studio/EditSettings"
import { PhotoDropzone } from "@/components/studio/PhotoDropzone"
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/studio/PhotoLightbox"
import { Button } from "@/components/ui/Button"
import {
  demoAccessHeaders,
  getClientDemoAccessCode,
  isDemoLockEnabled,
} from "@/lib/access/demo-access"
import { APP_NAME, copy } from "@/lib/brand"
import {
  makePreferenceThumbnail,
  preprocessPhotoFile,
} from "@/lib/images/preprocess-client"
import {
  MAX_CANDIDATE_PHOTOS,
  MIN_CANDIDATE_PHOTOS,
} from "@/lib/limits"
import {
  getRecentPreferenceEvents,
  savePreferenceEvent,
} from "@/lib/preferences/preference-memory"
import {
  createInitialStudioState,
  studioReducer,
} from "@/lib/studio/reducer"
import { createPreferenceId, photoIdFromIndex } from "@/lib/utils/ids"
import type { SequenceItem } from "@/lib/ai/schemas"
import type { ClientPhoto, EditResponse } from "@/types"

function sessionPhotoPathname(sessionId: string, photoId: string): string {
  return `sessions/${sessionId}/${photoId}.jpg`
}

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"])

function analysisMessage(
  phase: string,
  uploadProgress: { done: number; total: number } | null,
): string {
  if (phase === "preparing") return "Preparing working copies"
  if (phase === "uploading" && uploadProgress) {
    return `Uploading ${uploadProgress.done} / ${uploadProgress.total}`
  }
  if (phase === "uploading") return "Uploading"
  if (phase === "analyzing") return "Reading the full set"
  return "Working"
}

export function StudioShell() {
  const [state, dispatch] = useReducer(
    studioReducer,
    undefined,
    createInitialStudioState,
  )
  const [demoUnlocked, setDemoUnlocked] = useState(() => {
    if (!isDemoLockEnabled()) return true
    return Boolean(getClientDemoAccessCode())
  })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  const busy =
    state.phase === "preparing" ||
    state.phase === "uploading" ||
    state.phase === "analyzing"

  const canSubmit = useMemo(() => {
    const { photos } = state
    if (
      photos.length < MIN_CANDIDATE_PHOTOS ||
      photos.length > MAX_CANDIDATE_PHOTOS
    ) {
      return false
    }
    if (photos.some((p) => p.uploadStatus === "processing")) return false
    if (photos.some((p) => p.uploadStatus === "error")) return false
    if (state.targetCount < 1 || state.targetCount > photos.length) return false
    return photos.every(
      (p) =>
        p.uploadStatus === "local" ||
        p.uploadStatus === "uploaded" ||
        Boolean(p.processedBlob),
    )
  }, [state])

  const processFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((file) => ACCEPTED.has(file.type))
      if (imageFiles.length === 0) return

      const remaining = MAX_CANDIDATE_PHOTOS - state.photos.length
      if (remaining <= 0) {
        dispatch({ type: "SET_ERROR", error: copy.tooMany })
        return
      }

      const batch = imageFiles.slice(0, remaining)
      if (imageFiles.length > remaining) {
        dispatch({ type: "SET_ERROR", error: copy.tooMany })
      }

      const startIndex = state.photos.length
      const placeholders: ClientPhoto[] = batch.map((file, offset) => ({
        id: photoIdFromIndex(startIndex + offset),
        file,
        previewUrl: URL.createObjectURL(file),
        thumbnailDataUrl: "",
        width: 0,
        height: 0,
        uploadStatus: "processing",
      }))

      dispatch({
        type: "SET_PHOTOS",
        photos: [...state.photos, ...placeholders],
      })

      await Promise.all(
        placeholders.map(async (placeholder) => {
          try {
            const assets = await preprocessPhotoFile(placeholder.file)
            if (placeholder.previewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(placeholder.previewUrl)
            }
            dispatch({
              type: "UPSERT_PHOTO",
              photo: {
                ...placeholder,
                previewUrl: assets.previewUrl,
                thumbnailDataUrl: assets.thumbnailDataUrl,
                width: assets.width,
                height: assets.height,
                processedBlob: assets.processedBlob,
                uploadStatus: "local",
              },
            })
          } catch {
            dispatch({
              type: "UPSERT_PHOTO",
              photo: {
                ...placeholder,
                uploadStatus: "error",
                errorMessage: "Could not prepare this photo",
              },
            })
          }
        }),
      )
    },
    [state.photos],
  )

  const buildEdit = useCallback(async () => {
    if (!canSubmit) {
      if (state.photos.length < MIN_CANDIDATE_PHOTOS) {
        dispatch({ type: "SET_ERROR", error: copy.tooFew })
      } else if (state.photos.length > MAX_CANDIDATE_PHOTOS) {
        dispatch({ type: "SET_ERROR", error: copy.tooMany })
      }
      return
    }

    const sessionId = state.sessionId
    const photos = [...state.photos]
    dispatch({ type: "SET_PHASE", phase: "uploading" })
    dispatch({
      type: "SET_UPLOAD_PROGRESS",
      done: 0,
      total: photos.length,
    })

    const uploaded: ClientPhoto[] = []
    let done = 0

    try {
      for (const photo of photos) {
        if (photo.uploadedPathname && photo.uploadStatus === "uploaded") {
          uploaded.push(photo)
          done += 1
          dispatch({
            type: "SET_UPLOAD_PROGRESS",
            done,
            total: photos.length,
          })
          continue
        }

        if (!photo.processedBlob) {
          throw new Error(copy.uploadFail)
        }

        dispatch({
          type: "UPSERT_PHOTO",
          photo: { ...photo, uploadStatus: "uploading" },
        })

        const pathname = sessionPhotoPathname(sessionId, photo.id)
        const headers = demoAccessHeaders()
        const headerRecord =
          headers instanceof Headers
            ? Object.fromEntries(headers.entries())
            : { ...(headers as Record<string, string>) }

        try {
          const blob = await upload(pathname, photo.processedBlob, {
            access: "private",
            handleUploadUrl: "/api/upload",
            clientPayload: JSON.stringify({
              sessionId,
              photoId: photo.id,
            }),
            contentType: "image/jpeg",
            headers: headerRecord,
          })

          const next: ClientPhoto = {
            ...photo,
            uploadedPathname: blob.pathname,
            uploadStatus: "uploaded",
          }
          uploaded.push(next)
          dispatch({ type: "UPSERT_PHOTO", photo: next })
        } catch {
          dispatch({
            type: "UPSERT_PHOTO",
            photo: {
              ...photo,
              uploadStatus: "error",
              errorMessage: copy.uploadFail,
            },
          })
          throw new Error(copy.uploadFail)
        }

        done += 1
        dispatch({
          type: "SET_UPLOAD_PROGRESS",
          done,
          total: photos.length,
        })
      }

      dispatch({ type: "SET_PHASE", phase: "analyzing" })

      const preferences = getRecentPreferenceEvents(3)
      const controller = new AbortController()
      const timeoutMs = 190_000
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

      let response: Response
      try {
        response = await fetch("/api/edit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...demoAccessHeaders(),
          },
          signal: controller.signal,
          body: JSON.stringify({
            sessionId,
            mode: state.mode,
            targetCount: state.targetCount,
            photos: uploaded.map((photo) => ({
              id: photo.id,
              pathname: photo.uploadedPathname!,
              width: photo.width,
              height: photo.height,
            })),
            preferences: preferences.length > 0 ? preferences : undefined,
            strategy: "adaptive",
          }),
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error(copy.editTimeout)
        }
        throw error
      } finally {
        window.clearTimeout(timeoutId)
      }

      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : copy.aiFail
        throw new Error(message)
      }

      const editResponse = payload as EditResponse
      if (!editResponse?.result?.sequence) {
        throw new Error(copy.invalidResult)
      }

      // Server deletes temporary blobs after the run; force re-upload on next attempt.
      for (const photo of uploaded) {
        dispatch({
          type: "UPSERT_PHOTO",
          photo: {
            ...photo,
            uploadedPathname: undefined,
            uploadStatus: "local",
          },
        })
      }

      dispatch({ type: "SET_RESULT", result: editResponse })
    } catch (error) {
      for (const photo of state.photos) {
        if (photo.uploadStatus === "uploaded" || photo.uploadedPathname) {
          dispatch({
            type: "UPSERT_PHOTO",
            photo: {
              ...photo,
              uploadedPathname: undefined,
              uploadStatus: photo.processedBlob ? "local" : photo.uploadStatus,
            },
          })
        }
      }
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : copy.aiFail,
      })
    }
  }, [canSubmit, state])

  const handleReplace = useCallback(
    async (position: number, newId: string, oldItem: SequenceItem) => {
      const oldPhoto = state.photos.find((p) => p.id === oldItem.photoId)
      const newPhoto = state.photos.find((p) => p.id === newId)
      dispatch({
        type: "REPLACE_IN_SEQUENCE",
        position,
        newPhotoId: newId,
        markUserEdit: true,
      })

      if (!oldPhoto || !newPhoto || !state.result) return

      try {
        const [aiThumb, userThumb] = await Promise.all([
          makePreferenceThumbnail(
            oldPhoto.thumbnailDataUrl || oldPhoto.previewUrl,
          ),
          makePreferenceThumbnail(
            newPhoto.thumbnailDataUrl || newPhoto.previewUrl,
          ),
        ])
        savePreferenceEvent({
          id: createPreferenceId(),
          timestamp: new Date().toISOString(),
          mode: state.mode,
          position,
          role: oldItem.role,
          aiSelected: {
            thumbnailDataUrl: aiThumb,
            reason: oldItem.reason,
          },
          userPreferred: {
            thumbnailDataUrl: userThumb,
          },
        })
      } catch {
        // Preference persistence is best-effort.
      }
    },
    [state.photos, state.result, state.mode],
  )

  const lightboxPhotos: LightboxPhoto[] = useMemo(
    () =>
      state.photos.map((photo) => ({
        id: photo.id,
        src: photo.previewUrl || photo.thumbnailDataUrl,
      })),
    [state.photos],
  )

  if (!demoUnlocked) {
    return <DemoAccessGate onUnlocked={() => setDemoUnlocked(true)} />
  }

  const showAnalysis =
    state.phase === "uploading" || state.phase === "analyzing"

  return (
    <div className="min-h-screen bg-[var(--background)] text-ink">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[var(--muted)] transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              <ArrowLeft size={14} aria-hidden />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="text-[var(--line)]" aria-hidden>
              /
            </span>
            <p className="truncate text-sm font-medium tracking-[0.08em]">
              {APP_NAME}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state.phase === "results" ? (
              <Button
                variant="secondary"
                className="hidden text-xs uppercase tracking-[0.14em] sm:inline-flex"
                onClick={() => dispatch({ type: "RETURN_TO_SHEET" })}
              >
                Back to sheet
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="text-xs uppercase tracking-[0.14em]"
              onClick={() => {
                for (const photo of state.photos) {
                  if (photo.previewUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(photo.previewUrl)
                  }
                }
                dispatch({ type: "RESET" })
                setLightboxIndex(null)
              }}
            >
              New edit
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {state.phase === "empty" ? (
          <div className="space-y-8">
            <div className="max-w-2xl space-y-3">
              <h1 className="font-[family-name:var(--font-newsreader)] text-4xl text-ink sm:text-5xl">
                {copy.studioEmptyHeading}
              </h1>
              <p className="text-base leading-relaxed text-[var(--muted)]">
                {copy.studioEmptySub}
              </p>
            </div>
            <PhotoDropzone onFiles={processFiles} />
            <p className="text-xs text-[var(--muted)]">{copy.privacy}</p>
          </div>
        ) : null}

        {showAnalysis ? (
          <AnalysisState
            message={analysisMessage(state.phase, state.uploadProgress)}
            detail={
              state.phase === "analyzing"
                ? "The editor starts with the full shoot and may inspect close calls in more detail"
                : undefined
            }
          >
            <ContactSheet
              photos={state.photos}
              onRemove={() => undefined}
              onClear={() => undefined}
              onOpen={() => undefined}
              disabled
            />
          </AnalysisState>
        ) : null}

        {!showAnalysis &&
        state.phase !== "empty" &&
        state.phase !== "results" ? (
          <div className="space-y-8">
            <ContactSheet
              photos={state.photos}
              disabled={
                state.phase === "uploading" || state.phase === "analyzing"
              }
              onRemove={(id) => dispatch({ type: "REMOVE_PHOTO", id })}
              onClear={() => dispatch({ type: "CLEAR_PHOTOS" })}
              onOpen={(id) => {
                const index = state.photos.findIndex((p) => p.id === id)
                if (index >= 0) setLightboxIndex(index)
              }}
            />

            {state.photos.length < MIN_CANDIDATE_PHOTOS ? (
              <p className="text-sm text-[var(--muted)]">{copy.tooFew}</p>
            ) : null}
            {state.photos.length > MAX_CANDIDATE_PHOTOS ? (
              <p className="text-sm text-[var(--danger)]">{copy.tooMany}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={addInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={busy || state.photos.length >= MAX_CANDIDATE_PHOTOS}
                onChange={(e) => {
                  if (e.target.files) void processFiles(Array.from(e.target.files))
                  e.target.value = ""
                }}
              />
              <Button
                variant="secondary"
                disabled={busy || state.photos.length >= MAX_CANDIDATE_PHOTOS}
                onClick={() => addInputRef.current?.click()}
              >
                Add photos
              </Button>
              <p className="text-xs text-[var(--muted)]">
                JPEG, PNG or WebP · originals stay local · {state.photos.length}/
                {MAX_CANDIDATE_PHOTOS}
              </p>
            </div>

            <EditSettings
              mode={state.mode}
              targetCount={state.targetCount}
              photoCount={state.photos.length}
              onModeChange={(mode) => dispatch({ type: "SET_MODE", mode })}
              onTargetChange={(targetCount) =>
                dispatch({ type: "SET_TARGET_COUNT", targetCount })
              }
              onSubmit={() => void buildEdit()}
              canSubmit={canSubmit && !busy}
              submitting={busy}
            />

            {state.phase === "error" && state.error ? (
              <div
                role="alert"
                className="border border-[var(--danger)]/40 bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]"
              >
                {state.error}
              </div>
            ) : null}
          </div>
        ) : null}

        {state.phase === "results" && state.result ? (
          <EditResultView
            result={state.result}
            photos={state.photos}
            onReorder={(ids) =>
              dispatch({ type: "REORDER_SEQUENCE", photoIds: ids })
            }
            onReplace={handleReplace}
            userEditedPhotoIds={state.userEditedPhotoIds}
            replacementTargetPhotoId={state.replacementTargetPhotoId}
            onSetReplacementTarget={(photoId) =>
              dispatch({ type: "SET_REPLACEMENT_TARGET", photoId })
            }
          />
        ) : null}
      </main>

      {lightboxIndex !== null && state.phase !== "results" ? (
        <PhotoLightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  )
}
