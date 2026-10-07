// OpenCode TUI sidebar widget: opencode Go subscription usage limits
// (session / weekly / monthly) as bars + percentages.
// Installed as an npm plugin via `opencode plugin install` / tui.json.

import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"
import { fetchUsage, type UsageReport } from "./usage"

const BAR_WIDTH = 10
const REFRESH_MS = 30_000

function bar(filled: number): string {
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled)
}

// Session resets in hours+minutes; weekly/monthly in days+hours.
function resetCountdown(resetsAt: string | null, kind: "session" | "period"): string {
  if (!resetsAt) return "—"
  const ms = Date.parse(resetsAt) - Date.now()
  if (!Number.isFinite(ms)) return "—"
  const total = Math.max(0, Math.floor(ms / 60_000))
  const minutes = total % 60
  const hours = Math.floor(total / 60) % 24
  const days = Math.floor(total / 1440)
  return kind === "session" ? `${hours}h ${minutes}m` : `${days}d ${hours}h`
}

const tui: TuiPlugin = async (api) => {
  const [report, setReport] = createSignal<UsageReport | null>(null)

  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight = false

  const refresh = async () => {
    if (inFlight) return
    inFlight = true
    try {
      const next = await fetchUsage(api.lifecycle.signal)
      if (next) setReport(next)
    } catch {
      // keep last known data on failure
    } finally {
      inFlight = false
    }
  }

  // Register disposal before the first fetch so a dispose during the
  // initial request still prevents the interval from ever being created.
  api.lifecycle.onDispose(() => {
    if (timer) clearInterval(timer)
  })

  await refresh()
  if (api.lifecycle.signal.aborted) return
  timer = setInterval(refresh, REFRESH_MS)

  api.slots.register({
    order: 600,
    slots: {
      sidebar_content() {
        const theme = api.theme.current

        return (
          <box>
            <text fg={theme.text}>
              <b>Usage</b>
            </text>
            {report()?.map((w) => {
              const pct = w.percent
              const color =
                w.status === "rate-limited" || (pct ?? 0) >= 90
                  ? theme.error
                  : (pct ?? 0) >= 70
                    ? theme.warning
                    : theme.success
              return (
                <box flexDirection="row" columnGap={1}>
                  <text fg={theme.textMuted}>{w.label.padEnd(8)}</text>
                  <text fg={color}>{pct === null ? "—" : bar(Math.round((pct / 100) * BAR_WIDTH))}</text>
                  <text fg={theme.text}>{pct === null ? "—" : `${pct}%`}</text>
                  <text fg={theme.textMuted}>{resetCountdown(w.resetsAt, w.kind)}</text>
                </box>
              )
            })}
          </box>
        )
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id: "opencode-go-limits",
  tui,
}

export default plugin
