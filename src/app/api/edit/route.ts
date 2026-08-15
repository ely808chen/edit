import { NextResponse } from "next/server"
import { assertDemoAccess } from "@/lib/access/demo-access"
import { runEditor } from "@/lib/ai/editor"
import { EditRequestSchema } from "@/lib/ai/schemas"
import {
  deleteSessionBlobs,
  fetchPrivateBlobAsDataUrl,
} from "@/lib/storage/blob"
import type { EditorPhoto } from "@/types"

export const runtime = "nodejs"
export const maxDuration = 300

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

    const photos: EditorPhoto[] = []
    for (const photo of body.photos) {
      const { dataUrl } = await fetchPrivateBlobAsDataUrl(photo.pathname)
      photos.push({
        id: photo.id,
        dataUrl,
        width: photo.width,
        height: photo.height,
      })
    }

    const editorResult = await runEditor({
      photos,
      mode: body.mode,
      targetCount: body.targetCount,
      strategy: body.strategy ?? "adaptive",
      preferenceEvents: body.preferences,
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
