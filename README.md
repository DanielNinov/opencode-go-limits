# opencode-go-limits

An [OpenCode](https://opencode.ai) TUI plugin that shows your **opencode Go subscription usage limits** in the sidebar — session, weekly, and monthly windows as bars with percentage and reset countdown.

```
Usage
Session  ██████████ 100% 2h 3m
Weekly   ████░░░░░░ 40%  4d 5h
Monthly  ██░░░░░░░░ 20%  15d 3h
```

- **Session** — the 5-hour rolling window (`Xh Xm` until reset)
- **Weekly** — `Xd Xh` until reset
- **Monthly** — `Xd Xh` until reset

Bar color goes green → yellow (70%+) → red (90%+ or rate-limited). Data refreshes every 30 seconds.

## Requirements

- OpenCode with TUI plugin support (`@opencode-ai/plugin` ≥ 1.14)
- An active **opencode Go** subscription with `opencode` auth set up (`opencode auth login` or `/connect` in the TUI) — the key is read from `auth.json` under the `opencode-go` provider, from the first of:
  - `$OPENCODE_DATA_DIR`
  - `$XDG_DATA_HOME/opencode`
  - `~/.local/share/opencode`

## Install

```sh
opencode plugin install opencode-go-limits -g
```

or add it manually to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["opencode-go-limits"]
}
```

Restart OpenCode after installing. The widget appears in the sidebar below the built-in blocks (context, MCP, LSP, todos, files).

## How it works

The plugin calls the (undocumented) Go usage endpoint:

```
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <api-key>
```

which returns the percentage used and reset time for each window:

```json
{
  "usage": {
    "rolling":  { "status": "ok", "percent": 98, "resetsAt": "2026-10-07T22:03:52.000Z" },
    "weekly":   { "status": "ok", "percent": 39, "resetsAt": "2026-10-12T00:00:00.000Z" },
    "monthly":  { "status": "ok", "percent": 19, "resetsAt": "2026-10-22T18:11:46.000Z" }
  }
}
```

The API key is read from `auth.json` on every fetch, so rotating your key doesn't require a restart. If the fetch fails, a warning with the HTTP status is logged and the widget keeps its last known data; with no key configured, only the header is shown.

## Files

| File | Purpose |
|---|---|
| `plugin.tsx` | TUI plugin source: registers the `sidebar_content` slot and renders the bars |
| `usage.ts` | Fetch + parse of the usage endpoint (no dependencies) |
| `build.mjs` | Compiles the sources to `dist/` with the Babel solid preset |
| `dist/` | Compiled output — what npm ships and opencode loads |

## License

MIT
