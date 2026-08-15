import { del, get, list } from "@vercel/blob"

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

export async function fetchPrivateBlobAsDataUrl(
  pathname: string,
): Promise<{ dataUrl: string; contentType: string }> {
  const result = await get(pathname, { access: "private", useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Blob not found: ${pathname}`)
  }

  const contentType =
    result.blob.contentType ||
    result.headers.get("content-type") ||
    "image/jpeg"

  const buffer = await streamToBuffer(result.stream)
  const base64 = buffer.toString("base64")
  return {
    dataUrl: `data:${contentType};base64,${base64}`,
    contentType,
  }
}

export async function deleteSessionBlobs(sessionId: string): Promise<void> {
  const prefix = `sessions/${sessionId}/`
  const pathnames: string[] = []
  let cursor: string | undefined

  do {
    const page = await list({ prefix, cursor, limit: 100 })
    for (const blob of page.blobs) {
      pathnames.push(blob.pathname)
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  if (pathnames.length === 0) return
  await del(pathnames)
}

export function sessionPhotoPathname(
  sessionId: string,
  photoId: string,
): string {
  return `sessions/${sessionId}/${photoId}.jpg`
}
