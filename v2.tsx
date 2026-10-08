// OpenCode v2 TUI sidebar widget: opencode Go subscription usage limits
// (session / weekly / monthly) as bars + percentages.
// Port of v1.tsx for opencode v2 (Anomaly). The v2 loader duck-types the
// default export (non-empty `id` string + `setup` function, extra keys
// ignored), so no runtime SDK import is needed here.

import type { ResolvedTheme } from "@opencode/theme/tui"
import { createSignal } from "solid-js"
import { fetchUsage, type UsageReport } from "./usage"
import { BAR_WIDTH, bar, resetCountdown } from "./shared"

const REFRESH_MS = 30_000

// Minimal structural types for the v2 plugin context, matching the confirmed
// @opencode/plugin@2.0.24 surface: context.ui.slot(claim) => disposer,
// sidebar.content render props { sessionID }, theme tokens read per render.
// Theme is typed as the host's ResolvedTheme (@opencode/theme/tui) so the
// token paths used below are typechecked.
interface V2SlotContext {
  ui: {
    slot(claim: {
      append: "sidebar.content"
      render: (props: { sessionID: string }) => any
    }): () => void
  }
  theme: ResolvedTheme
}

type V2Setup = (context: V2SlotContext) => Promise<(() => void) | void> | (() => void) | void

const setup: V2Setup = async (context) => {
  const [report, setReport] = createSignal<UsageReport | null>(null)

  // v2 has no api.lifecycle.signal/onDispose — own AbortController instead.
  const controller = new AbortController()
  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight = false

  const refresh = async () => {
    if (inFlight) return
    inFlight = true
    try {
      const next = await fetchUsage(controller.signal)
      if (next) setReport(next)
    } catch {
      // keep last known data on failure
    } finally {
      inFlight = false
    }
  }

  // Register the slot before the first fetch so a dispose during the
  // initial request still prevents the interval from ever being created.
  const disposeSlot = context.ui.slot({
    append: "sidebar.content",
    render: () => {
      // Read tokens inside render so theme switches are picked up fresh,
      // mirroring v1's per-render api.theme.current read.
      const theme = context.theme

      return (
        <box>
          <text fg={theme.text.base}>
            <b>Usage</b>
          </text>
          {report()?.map((w) => {
            const pct = w.percent
            const color =
              w.status === "rate-limited" || (pct ?? 0) >= 90
                ? theme.text.feedback.error.base
                : (pct ?? 0) >= 70
                  ? theme.text.feedback.warning.base
                  : theme.text.feedback.success.base
            return (
              <box flexDirection="row" columnGap={1}>
                <text fg={theme.text.muted}>{w.label.padEnd(8)}</text>
                <text fg={color}>{pct === null ? "—" : bar(Math.round((pct / 100) * BAR_WIDTH))}</text>
                <text fg={theme.text.base}>{pct === null ? "—" : `${pct}%`}</text>
                <text fg={theme.text.muted}>{resetCountdown(w.resetsAt, w.kind)}</text>
              </box>
            )
          })}
        </box>
      )
    },
  })

  await refresh()
  // No aborted-signal early return here (unlike v1): nothing can abort the
  // controller before this cleanup exists, and an early return would leak the
  // registered slot claim. Always start the interval and return the cleanup.
  timer = setInterval(refresh, REFRESH_MS)

  return () => {
    if (timer) clearInterval(timer)
    controller.abort()
    disposeSlot()
  }
}

const plugin: { id: string; setup: V2Setup } = {
  id: "opencode-go-limits",
  setup,
}

export default plugin
