// Fetch + parse opencode Go subscription usage limits.
// Endpoint (undocumented): GET https://opencode.ai/zen/go/v1/usage
// Auth: Bearer key from auth.json under provider id "opencode-go".
// Response: { usage: { rolling: { status, percent, resetsAt }, weekly: {...}, monthly: {...} } }

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

export type UsageWindow = {
  label: string
  kind: "session" | "period"
  percent: number | null
  status: string | null
  resetsAt: string | null
}

export type UsageReport = UsageWindow[]

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage"
const USER_AGENT = "opencode-go-limits"

function dataDir(): string {
  if (process.env.OPENCODE_DATA_DIR) return process.env.OPENCODE_DATA_DIR
  if (process.env.XDG_DATA_HOME) return join(process.env.XDG_DATA_HOME, "opencode")
  return join(homedir(), ".local", "share", "opencode")
}

function readApiKey(): string | null {
  try {
    const auth = JSON.parse(readFileSync(join(dataDir(), "auth.json"), "utf8"))
    const key = auth["opencode-go"]?.key
    return typeof key === "string" && key.length > 0 ? key : null
  } catch {
    return null
  }
}

function clampPercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseWindow(label: string, kind: "session" | "period", raw: unknown): UsageWindow {
  const w = (raw ?? {}) as Record<string, unknown>
  return {
    label,
    kind,
    percent: clampPercent(w.percent),
    status: typeof w.status === "string" ? w.status : null,
    resetsAt: typeof w.resetsAt === "string" ? w.resetsAt : null,
  }
}

export async function fetchUsage(outerSignal?: AbortSignal): Promise<UsageReport | null> {
  const key = readApiKey()
  if (!key) return null

  const res = await fetch(USAGE_URL, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.any([AbortSignal.timeout(10_000), ...(outerSignal ? [outerSignal] : [])]),
  })
  if (!res.ok) {
    console.warn(`[opencode-go-limits] usage fetch failed: HTTP ${res.status}`)
    return null
  }

  const body = (await res.json()) as { usage?: Record<string, unknown> }
  const usage = body.usage
  if (!usage || typeof usage !== "object") return null

  return [
    parseWindow("Session", "session", usage.rolling),
    parseWindow("Weekly", "period", usage.weekly),
    parseWindow("Monthly", "period", usage.monthly),
  ]
}
