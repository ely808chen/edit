import { promises as fs } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { runEditor } from "../src/lib/ai/editor"
import type { EditMode } from "../src/lib/ai/schemas"
import type { EditStrategy, EditorPhoto } from "../src/types"

async function loadEnvFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // optional
  }
}

await loadEnvFile(path.resolve(".env.local"))
await loadEnvFile(path.resolve(".env"))

type GroundTruth = {
  mustInclude: string[]
  acceptable?: string[]
  mustExclude: string[]
}

type ShootConfig = {
  id: string
  directory: string
  mode: EditMode
  targetCount: number
  groundTruth: GroundTruth
}

type Manifest = {
  shoots: ShootConfig[]
}

const STRATEGIES: EditStrategy[] = ["low-only", "full-high", "adaptive"]

function parseArgs(argv: string[]) {
  const out: { manifest: string } = {
    manifest: "evals/manifest.json",
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--manifest" && argv[i + 1]) {
      out.manifest = argv[++i]!
    }
  }
  return out
}

async function loadImages(directory: string): Promise<EditorPhoto[]> {
  const abs = path.resolve(directory)
  const entries = await fs.readdir(abs)
  const files = entries
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 20)

  if (files.length < 12) {
    throw new Error(
      `Shoot ${directory} needs 12–20 images (found ${files.length})`,
    )
  }

  const photos: EditorPhoto[] = []
  for (let i = 0; i < files.length; i++) {
    const filename = files[i]!
    const buffer = await fs.readFile(path.join(abs, filename))
    const ext = path.extname(filename).toLowerCase()
    const mime =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg"
    const id = `p${String(i + 1).padStart(2, "0")}`
    photos.push({
      id,
      filename,
      width: 1600,
      height: 1200,
      dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    })
  }
  return photos
}

function filenameForId(photos: EditorPhoto[], id: string): string {
  return photos.find((p) => p.id === id)?.filename ?? id
}

function scoreSelection(
  selectedFilenames: string[],
  truth: GroundTruth,
): {
  mustIncludeRecall: number
  mustExcludeViolations: number
  selectionOverlap: number
} {
  const selected = new Set(selectedFilenames)
  const mustIncludeHits = truth.mustInclude.filter((f) => selected.has(f)).length
  const mustIncludeRecall =
    truth.mustInclude.length === 0
      ? 1
      : mustIncludeHits / truth.mustInclude.length
  const mustExcludeViolations = truth.mustExclude.filter((f) =>
    selected.has(f),
  ).length
  const preferred = new Set([
    ...truth.mustInclude,
    ...(truth.acceptable ?? []),
  ])
  const overlapCount = selectedFilenames.filter((f) => preferred.has(f)).length
  const selectionOverlap =
    preferred.size === 0 ? 0 : overlapCount / preferred.size

  return { mustIncludeRecall, mustExcludeViolations, selectionOverlap }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required to run evals.")
    process.exit(1)
  }

  const { manifest: manifestPath } = parseArgs(process.argv.slice(2))
  const absManifest = path.resolve(manifestPath)
  const raw = await fs.readFile(absManifest, "utf8")
  const manifest = JSON.parse(raw) as Manifest

  for (const shoot of manifest.shoots) {
    const shootDir = path.resolve(path.dirname(absManifest), shoot.directory)
    const photos = await loadImages(shootDir)
    console.log(`\n=== Shoot: ${shoot.id} (${photos.length} photos) ===`)

    for (const strategy of STRATEGIES) {
      const result = await runEditor({
        photos,
        mode: shoot.mode,
        targetCount: shoot.targetCount,
        strategy,
      })

      if (!result.ok) {
        console.log({
          strategy,
          error: result.error,
          debug: result.debug,
        })
        continue
      }

      const selectedFilenames = result.result.sequence.map((item) =>
        filenameForId(photos, item.photoId),
      )
      const metrics = scoreSelection(selectedFilenames, shoot.groundTruth)

      console.log({
        strategy,
        model: result.debug.model,
        totalPhotos: result.debug.totalPhotos,
        targetCount: shoot.targetCount,
        selectedFilenames,
        ...metrics,
        uniqueHighDetailInspections: result.debug.uniquePhotosInspected,
        latencyMs: result.debug.durationMs,
        usage: result.debug.usage ?? null,
      })
    }
  }
}

const isDirect =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirect) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
