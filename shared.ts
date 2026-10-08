// Pure rendering helpers shared by the v1 and v2 plugin implementations.
// No theme or JSX here — color picking stays inline in each implementation
// because it needs that version's theme tokens.

export const BAR_WIDTH = 10

export function bar(filled: number): string {
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled)
}

// Session resets in hours+minutes; weekly/monthly in days+hours.
export function resetCountdown(resetsAt: string | null, kind: "session" | "period"): string {
  if (!resetsAt) return "—"
  const ms = Date.parse(resetsAt) - Date.now()
  if (!Number.isFinite(ms)) return "—"
  const total = Math.max(0, Math.floor(ms / 60_000))
  const minutes = total % 60
  const hours = Math.floor(total / 60) % 24
  const days = Math.floor(total / 1440)
  return kind === "session" ? `${hours}h ${minutes}m` : `${days}d ${hours}h`
}
