import { NextResponse } from "next/server"
import { assertDemoAccess } from "@/lib/access/demo-access"
import { runEditor } from "@/lib/ai/editor"
import { EditRequestSchema } from "@/lib/ai/schemas"
import { resizeDataUrlForModel } from "@/lib/images/server-image"
import {
  deleteSessionBlobs,
  fetchPrivateBlobAsDataUrl,
} from "@/lib/storage/blob"
import type { EditorPhoto } from "@/types"

export const runtime = "nodejs"
export const maxDuration = 300

const OVERVIEW_LONG_EDGE = 768
const DETAIL_LONG_EDGE = 1280

export async function POST(request: Request): Promise<NextResponse> {
  const access = assertDemoAccess(request.headers)
  if (!access.ok) {
    return NextResponse.json(
      { error: access.message },
      { status: access.status },
    )
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY. Add it to .env.local for local development.",
      },
      { status: 500 },
    )
  }

  let sessionId: string | null = null
  const started = Date.now()

  try {
    const json: unknown = await request.json()
    const parsed = EditRequestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid edit request",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const body = parsed.data
    sessionId = body.sessionId
    console.info("[edit] start", {
      sessionId,
      photos: body.photos.length,
      targetCount: body.targetCount,
      mode: body.mode,
    })

    const photos: EditorPhoto[] = []
    for (const photo of body.photos) {
      const loadStarted = Date.now()
      const { dataUrl } = await fetchPrivateBlobAsDataUrl(photo.pathname)
      const [overview, detail] = await Promise.all([
        resizeDataUrlForModel(dataUrl, OVERVIEW_LONG_EDGE, 70),
        resizeDataUrlForModel(dataUrl, DETAIL_LONG_EDGE, 78),
      ])
      photos.push({
        id: photo.id,
        dataUrl: overview.dataUrl,
        overviewDataUrl: overview.dataUrl,
        detailDataUrl: detail.dataUrl,
        width: overview.width,
        height: overview.height,
      })
      console.info("[edit] photo ready", {
        id: photo.id,
        ms: Date.now() - loadStarted,
      })
    }

    console.info("[edit] running editor", {
      photos: photos.length,
      prepMs: Date.now() - started,
    })

    const editorResult = await runEditor({
      photos,
      mode: body.mode,
      targetCount: body.targetCount,
      strategy: body.strategy ?? "adaptive",
      preferenceEvents: body.preferences,
    })

    console.info("[edit] finished", {
      ok: editorResult.ok,
      totalMs: Date.now() - started,
      inspected: editorResult.debug.uniquePhotosInspected,
    })

    if (!editorResult.ok) {
      return NextResponse.json(
        {
          error: editorResult.error,
          debug: editorResult.debug,
        },
        { status: 422 },
      )
    }

    return NextResponse.json({
      result: editorResult.result,
      debug: editorResult.debug,
    })
  } catch (error) {
    console.error("[edit] failed", {
      ms: Date.now() - started,
      message: error instanceof Error ? error.message : "unknown",
    })
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The editor couldn’t finish this set. Your originals are still safe on your device",
      },
      { status: 500 },
    )
  } finally {
    if (sessionId) {
      try {
        await deleteSessionBlobs(sessionId)
      } catch (cleanupError) {
        console.error(
          "[edit] blob cleanup failed",
          cleanupError instanceof Error
            ? cleanupError.message
            : "unknown cleanup error",
        )
      }
    }
  }
}
