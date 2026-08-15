const DEMO_HEADER = "x-demo-access-code"
const DEMO_STORAGE_KEY = "edit.demoAccessCode"

export function isDemoLockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOCK === "true"
}

export function getExpectedDemoAccessCode(): string | undefined {
  const code = process.env.DEMO_ACCESS_CODE?.trim()
  return code || undefined
}

export function readDemoAccessCodeFromHeader(
  headers: Headers,
): string | null {
  return headers.get(DEMO_HEADER)
}

export function assertDemoAccess(headers: Headers): {
  ok: true
} | {
  ok: false
  status: number
  message: string
} {
  if (!isDemoLockEnabled()) return { ok: true }
  const expected = getExpectedDemoAccessCode()
  if (!expected) {
    return {
      ok: false,
      status: 500,
      message: "Demo lock is enabled but DEMO_ACCESS_CODE is not configured.",
    }
  }
  const provided = readDemoAccessCodeFromHeader(headers)
  if (!provided || provided !== expected) {
    return {
      ok: false,
      status: 401,
      message: "This demo is access-controlled",
    }
  }
  return { ok: true }
}

export function getClientDemoAccessCode(): string | null {
  if (typeof window === "undefined") return null
  try {
    return sessionStorage.getItem(DEMO_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setClientDemoAccessCode(code: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, code)
  } catch {
    // ignore
  }
}

export function demoAccessHeaders(): HeadersInit {
  const code = getClientDemoAccessCode()
  if (!code) return {}
  return { [DEMO_HEADER]: code }
}

export { DEMO_HEADER, DEMO_STORAGE_KEY }
