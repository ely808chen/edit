import type { PreferenceEvent } from "@/types"
import { PreferenceEventPayloadSchema } from "@/lib/ai/schemas"

const STORAGE_KEY = "edit.preferenceEvents.v1"
const MAX_EVENTS = 5

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined"
}

export function loadPreferenceEvents(): PreferenceEvent[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const events: PreferenceEvent[] = []
    for (const item of parsed) {
      const result = PreferenceEventPayloadSchema.safeParse(item)
      if (result.success) events.push(result.data)
    }
    return events.slice(0, MAX_EVENTS)
  } catch {
    return []
  }
}

export function savePreferenceEvent(event: PreferenceEvent): PreferenceEvent[] {
  const existing = loadPreferenceEvents()
  const next = [event, ...existing.filter((e) => e.id !== event.id)].slice(
    0,
    MAX_EVENTS,
  )
  if (canUseStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore quota / private mode
    }
  }
  return next
}

export function clearPreferenceEvents(): void {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function getRecentPreferenceEvents(limit = 3): PreferenceEvent[] {
  return loadPreferenceEvents().slice(0, Math.max(0, limit))
}
