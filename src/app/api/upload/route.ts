import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { assertDemoAccess } from "@/lib/access/demo-access"
import { z } from "zod"

export const runtime = "nodejs"

const ClientPayloadSchema = z.object({
  sessionId: z.string().min(8).max(128),
  photoId: z.string().regex(/^p\d{2}$/),
})

export async function POST(request: Request): Promise<NextResponse> {
  const access = assertDemoAccess(request.headers)
  if (!access.ok) {
    return NextResponse.json(
      { error: access.message },
      { status: access.status },
    )
  }

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: "Invalid upload body" }, { status: 400 })
  }

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let parsedPayload: z.infer<typeof ClientPayloadSchema> | null = null
        if (clientPayload) {
          try {
            parsedPayload = ClientPayloadSchema.parse(JSON.parse(clientPayload))
          } catch {
            throw new Error("Invalid client payload")
          }
        }

        if (!parsedPayload) {
          throw new Error("Missing session payload")
        }

        const expectedPrefix = `sessions/${parsedPayload.sessionId}/`
        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Pathname does not match session")
        }

        if (!pathname.includes(`/${parsedPayload.photoId}.`)) {
          throw new Error("Pathname does not match photo ID")
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 12 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({
            sessionId: parsedPayload.sessionId,
            photoId: parsedPayload.photoId,
          }),
        }
      },
      onUploadCompleted: async () => {
        // Temporary session blobs; no persistence needed.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Upload token failed",
      },
      { status: 400 },
    )
  }
}
