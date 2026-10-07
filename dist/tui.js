import { memo as _$memo } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */
// OpenCode TUI sidebar widget: opencode Go subscription usage limits
// (session / weekly / monthly) as bars + percentages.
// Registered as a file plugin in ~/.config/opencode/tui.json.

import { createSignal } from "solid-js";
import { fetchUsage } from "./usage";
const BAR_WIDTH = 10;
const REFRESH_MS = 30_000;
function bar(filled) {
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

// Session resets in hours+minutes; weekly/monthly in days+hours.
function resetCountdown(resetsAt, kind) {
  if (!resetsAt) return "—";
  const ms = Date.parse(resetsAt) - Date.now();
  if (!Number.isFinite(ms)) return "—";
  const total = Math.max(0, Math.floor(ms / 60_000));
  const minutes = total % 60;
  const hours = Math.floor(total / 60) % 24;
  const days = Math.floor(total / 1440);
  return kind === "session" ? `${hours}h ${minutes}m` : `${days}d ${hours}h`;
}
const tui = async api => {
  const [report, setReport] = createSignal(null);
  let timer;
  let inFlight = false;
  const refresh = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const next = await fetchUsage();
      if (next) setReport(next);
    } catch {
      // keep last known data on failure
    } finally {
      inFlight = false;
    }
  };
  await refresh();
  timer = setInterval(refresh, REFRESH_MS);
  api.lifecycle.onDispose(() => {
    if (timer) clearInterval(timer);
  });
  api.slots.register({
    order: 600,
    slots: {
      sidebar_content() {
        const theme = api.theme.current;
        const data = report();
        return (() => {
          var _el$ = _$createElement("box"),
            _el$2 = _$createElement("text"),
            _el$3 = _$createElement("b");
          _$insertNode(_el$, _el$2);
          _$insertNode(_el$2, _el$3);
          _$insertNode(_el$3, _$createTextNode(`Usage`));
          _$insert(_el$, () => data?.map(w => {
            const pct = w.percent;
            const color = w.status === "rate-limited" || (pct ?? 0) >= 90 ? theme.error : (pct ?? 0) >= 70 ? theme.warning : theme.success;
            const kind = w.label === "Session" ? "session" : "period";
            return (() => {
              var _el$5 = _$createElement("box"),
                _el$6 = _$createElement("text"),
                _el$7 = _$createElement("text"),
                _el$8 = _$createElement("text"),
                _el$9 = _$createElement("text");
              _$insertNode(_el$5, _el$6);
              _$insertNode(_el$5, _el$7);
              _$insertNode(_el$5, _el$8);
              _$insertNode(_el$5, _el$9);
              _$setProp(_el$5, "flexDirection", "row");
              _$setProp(_el$5, "columnGap", 1);
              _$insert(_el$6, () => w.label.padEnd(8));
              _$setProp(_el$7, "fg", color);
              _$insert(_el$7, () => pct === null ? "—" : bar(Math.round(pct / 100 * BAR_WIDTH)));
              _$insert(_el$8, pct === null ? "—" : `${pct}%`);
              _$insert(_el$9, () => resetCountdown(w.resetsAt, kind));
              _$effect(_p$ => {
                var _v$ = theme.textMuted,
                  _v$2 = theme.text,
                  _v$3 = theme.textMuted;
                _v$ !== _p$.e && (_p$.e = _$setProp(_el$6, "fg", _v$, _p$.e));
                _v$2 !== _p$.t && (_p$.t = _$setProp(_el$8, "fg", _v$2, _p$.t));
                _v$3 !== _p$.a && (_p$.a = _$setProp(_el$9, "fg", _v$3, _p$.a));
                return _p$;
              }, {
                e: undefined,
                t: undefined,
                a: undefined
              });
              return _el$5;
            })();
          }), null);
          _$effect(_$p => _$setProp(_el$2, "fg", theme.text, _$p));
          return _el$;
        })();
      }
    }
  });
};
const plugin = {
  id: "opencode-go-limits",
  tui
};
export default plugin;