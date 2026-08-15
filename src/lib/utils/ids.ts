export function photoIdFromIndex(index: number): string {
  return `p${String(index + 1).padStart(2, "0")}`
}

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function createPreferenceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `pref_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
