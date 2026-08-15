const WORKING_LONG_EDGE = 1600
const WORKING_QUALITY = 0.82
const THUMB_LONG_EDGE = 320
const THUMB_QUALITY = 0.72
const PREF_THUMB_LONG_EDGE = 112
const PREF_THUMB_QUALITY = 0.6

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not decode image"))
    }
    img.src = url
  })
}

function drawToCanvas(
  img: HTMLImageElement,
  maxLongEdge: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  const longEdge = Math.max(srcW, srcH)
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not available")
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, width, height }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Failed to encode JPEG"))
        else resolve(blob)
      },
      "image/jpeg",
      quality,
    )
  })
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  quality: number,
): string {
  return canvas.toDataURL("image/jpeg", quality)
}

export type ProcessedPhotoAssets = {
  width: number
  height: number
  processedBlob: Blob
  thumbnailDataUrl: string
  previewUrl: string
}

export async function preprocessPhotoFile(
  file: File,
): Promise<ProcessedPhotoAssets> {
  const img = await loadImageFromFile(file)
  const working = drawToCanvas(img, WORKING_LONG_EDGE)
  const processedBlob = await canvasToBlob(working.canvas, WORKING_QUALITY)
  const previewUrl = URL.createObjectURL(processedBlob)

  const thumb = drawToCanvas(img, THUMB_LONG_EDGE)
  const thumbnailDataUrl = canvasToDataUrl(thumb.canvas, THUMB_QUALITY)

  return {
    width: working.width,
    height: working.height,
    processedBlob,
    thumbnailDataUrl,
    previewUrl,
  }
}

export async function makePreferenceThumbnail(
  source: HTMLImageElement | string,
): Promise<string> {
  let img: HTMLImageElement
  if (typeof source === "string") {
    img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Could not load thumbnail source"))
      el.src = source
    })
  } else {
    img = source
  }
  const { canvas } = drawToCanvas(img, PREF_THUMB_LONG_EDGE)
  return canvasToDataUrl(canvas, PREF_THUMB_QUALITY)
}
