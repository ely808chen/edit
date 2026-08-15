import sharp from "sharp"

export async function bufferToDataUrl(
  buffer: Buffer,
  contentType = "image/jpeg",
): Promise<string> {
  return `data:${contentType};base64,${buffer.toString("base64")}`
}

export async function dataUrlFromArrayBuffer(
  data: ArrayBuffer,
  contentType = "image/jpeg",
): Promise<string> {
  return bufferToDataUrl(Buffer.from(data), contentType)
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) {
    throw new Error("Invalid data URL")
  }
  return {
    mime: match[1]!,
    buffer: Buffer.from(match[2]!, "base64"),
  }
}

/**
 * Downscale an image for model vision calls.
 * Keeps payloads small enough that multi-image agent runs finish in minutes, not hang forever.
 */
export async function resizeDataUrlForModel(
  dataUrl: string,
  maxLongEdge: number,
  quality = 72,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { buffer } = parseDataUrl(dataUrl)
  const image = sharp(buffer, { failOn: "none" }).rotate()
  const meta = await image.metadata()
  const srcW = meta.width ?? maxLongEdge
  const srcH = meta.height ?? maxLongEdge
  const longEdge = Math.max(srcW, srcH)
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const out = await image
    .resize({
      width,
      height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer()

  return {
    dataUrl: await bufferToDataUrl(out, "image/jpeg"),
    width,
    height,
  }
}
