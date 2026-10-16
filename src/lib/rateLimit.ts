// Best-effort credit protection for the Next.js API route (Node/Vercel deployments).
// Mirrors the PHP endpoint: a per-visitor hourly limit plus a daily cap, after which the route
// answers with the free demo engine instead of calling the LLM. Visitor IPs are kept only as
// salted hashes — never stored raw.
//
// Limits of this design: counters live in memory, so on Vercel/serverless each instance counts on
// its own and a cold start resets it — the daily cap is per instance, not global. For a hard,
// global ceiling, also set a spend limit on the API key's workspace in the Claude Console.

import { createHash, randomBytes } from "crypto";

const SALT = randomBytes(16).toString("hex");

export interface Limits {
  perIpHourly: number;
  daily: number;
}

export function limitsFromEnv(env: Record<string, string | undefined> = process.env): Limits {
  const num = (v: string | undefined, d: number) => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  return { perIpHourly: num(env.AI_PER_IP_HOURLY, 10), daily: num(env.AI_DAILY_LIMIT, 150) };
}

export function createLimiter(limits: Limits, now: () => number = Date.now) {
  const counts = new Map<string, number>();

  const prune = (hour: string, day: string) => {
    for (const k of counts.keys()) {
      if (!k.endsWith(`|${hour}`) && !k.endsWith(`|${day}`)) counts.delete(k);
    }
  };

  /** Records one AI call for this visitor; false when the hourly or daily limit is already used up. */
  return function allow(ip: string): boolean {
    const d = new Date(now());
    const day = d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const hour = d.toISOString().slice(0, 13); // YYYY-MM-DDTHH (UTC)
    if (counts.size > 5000) prune(hour, day);

    const ipKey = `ip:${createHash("sha256").update(SALT + ip).digest("hex").slice(0, 24)}|${hour}`;
    const dayKey = `day|${day}`;
    const ipCount = counts.get(ipKey) ?? 0;
    const dayCount = counts.get(dayKey) ?? 0;

    if (limits.perIpHourly > 0 && ipCount >= limits.perIpHourly) return false;
    if (limits.daily > 0 && dayCount >= limits.daily) return false;

    counts.set(ipKey, ipCount + 1);
    counts.set(dayKey, dayCount + 1);
    return true;
  };
}

/**
 * Visitor key for the hourly limit. X-Forwarded-For / X-Real-IP are only trusted behind a proxy
 * that sets them itself (Vercel, or TRUST_PROXY=1 behind your own reverse proxy). On a directly
 * exposed Node server a client could send a different X-Forwarded-For on every call, so all
 * callers share one bucket there instead — the hourly limit then acts globally, which is stricter
 * but cannot be bypassed. The daily cap applies in every case.
 */
export function clientIp(headers: Headers, env: Record<string, string | undefined> = process.env): string {
  const trusted = env.VERCEL === "1" || env.TRUST_PROXY === "1";
  if (!trusted) return "untrusted-proxy";
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
