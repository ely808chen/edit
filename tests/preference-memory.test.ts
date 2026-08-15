import { beforeEach, describe, expect, it, vi } from "vitest"

const store = new Map<string, string>()

vi.stubGlobal("window", {})
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
})

import {
  clearPreferenceEvents,
  getRecentPreferenceEvents,
  loadPreferenceEvents,
  savePreferenceEvent,
} from "@/lib/preferences/preference-memory"
import type { PreferenceEvent } from "@/types"

function event(id: string): PreferenceEvent {
  return {
    id,
    timestamp: new Date().toISOString(),
    mode: "photography",
    position: 2,
    role: "detail",
    aiSelected: { thumbnailDataUrl: "data:image/jpeg;base64,aaa" },
    userPreferred: { thumbnailDataUrl: "data:image/jpeg;base64,bbb" },
  }
}

describe("preference memory", () => {
  beforeEach(() => {
    store.clear()
  })

  it("stores an event", () => {
    savePreferenceEvent(event("a"))
    expect(loadPreferenceEvents()).toHaveLength(1)
  })

  it("caps at 5 and keeps newest first", () => {
    for (let i = 0; i < 7; i++) {
      savePreferenceEvent(event(`e${i}`))
    }
    const loaded = loadPreferenceEvents()
    expect(loaded).toHaveLength(5)
    expect(loaded[0]?.id).toBe("e6")
    expect(loaded.map((e) => e.id)).toEqual(["e6", "e5", "e4", "e3", "e2"])
  })

  it("returns recent events with limit", () => {
    savePreferenceEvent(event("a"))
    savePreferenceEvent(event("b"))
    savePreferenceEvent(event("c"))
    expect(getRecentPreferenceEvents(2).map((e) => e.id)).toEqual(["c", "b"])
  })

  it("clears events", () => {
    savePreferenceEvent(event("a"))
    clearPreferenceEvents()
    expect(loadPreferenceEvents()).toEqual([])
  })

  it("does not crash on malformed localStorage", () => {
    store.set("edit.preferenceEvents.v1", "{not-json")
    expect(loadPreferenceEvents()).toEqual([])
    store.set("edit.preferenceEvents.v1", JSON.stringify([{ bad: true }]))
    expect(loadPreferenceEvents()).toEqual([])
  })
})
