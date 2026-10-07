// Fetch + parse opencode Go subscription usage limits.
// Endpoint (undocumented): GET https://opencode.ai/zen/go/v1/usage
// Auth: Bearer key from auth.json under provider id "opencode-go".
// Response: { usage: { rolling: { status, percent, resetsAt }, weekly: {...}, monthly: {...} } }

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const USER_AGENT = "opencode-go-limits/0.1.0";
function dataDir() {
  if (process.env.OPENCODE_DATA_DIR) return process.env.OPENCODE_DATA_DIR;
  if (process.env.XDG_DATA_HOME) return join(process.env.XDG_DATA_HOME, "opencode");
  return join(homedir(), ".local", "share", "opencode");
}
function readApiKey() {
  try {
    const auth = JSON.parse(readFileSync(join(dataDir(), "auth.json"), "utf8"));
    const entry = auth["opencode-go"] ?? auth["opencode"];
    const key = entry?.key;
    return typeof key === "string" && key.length > 0 ? key : null;
  } catch {
    return null;
  }
}
function clampPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}
function parseWindow(label, raw) {
  const w = raw ?? {};
  return {
    label,
    percent: clampPercent(w.percent),
    status: typeof w.status === "string" ? w.status : null,
    resetsAt: typeof w.resetsAt === "string" ? w.resetsAt : null
  };
}
export async function fetchUsage() {
  const key = readApiKey();
  if (!key) return null;
  const res = await fetch(USAGE_URL, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!res.ok) return null;
  const body = await res.json();
  const usage = body.usage;
  if (!usage || typeof usage !== "object") return null;
  return [parseWindow("Session", usage.rolling), parseWindow("Weekly", usage.weekly), parseWindow("Monthly", usage.monthly)];
}