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
