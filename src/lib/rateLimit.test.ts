import { describe, expect, it } from "vitest";
import { clientIp, createLimiter, limitsFromEnv } from "@/lib/rateLimit";

const at = (iso: string) => () => Date.parse(iso);

describe("createLimiter", () => {
  it("allows the hourly quota per visitor, then blocks that visitor only", () => {
    const allow = createLimiter({ perIpHourly: 3, daily: 100 }, at("2026-10-16T10:15:00Z"));
    expect([allow("1.1.1.1"), allow("1.1.1.1"), allow("1.1.1.1")]).toEqual([true, true, true]);
    expect(allow("1.1.1.1")).toBe(false);
    expect(allow("2.2.2.2")).toBe(true);
  });

  it("resets the per-visitor quota in the next hour", () => {
    let now = Date.parse("2026-10-16T10:59:00Z");
    const allow = createLimiter({ perIpHourly: 1, daily: 100 }, () => now);
    expect(allow("1.1.1.1")).toBe(true);
    expect(allow("1.1.1.1")).toBe(false);
    now = Date.parse("2026-10-16T11:00:00Z");
    expect(allow("1.1.1.1")).toBe(true);
  });

  it("enforces the global daily cap across visitors", () => {
    const allow = createLimiter({ perIpHourly: 10, daily: 2 }, at("2026-10-16T09:00:00Z"));
    expect(allow("1.1.1.1")).toBe(true);
    expect(allow("2.2.2.2")).toBe(true);
    expect(allow("3.3.3.3")).toBe(false);
  });

  it("treats 0 as 'no limit'", () => {
    const allow = createLimiter({ perIpHourly: 0, daily: 0 }, at("2026-10-16T09:00:00Z"));
    for (let i = 0; i < 50; i++) expect(allow("1.1.1.1")).toBe(true);
  });
});

describe("limitsFromEnv", () => {
  it("defaults to 10 per visitor per hour and 150 per day", () => {
    expect(limitsFromEnv({})).toEqual({ perIpHourly: 10, daily: 150 });
  });
  it("reads overrides and ignores junk", () => {
    expect(limitsFromEnv({ AI_PER_IP_HOURLY: "5", AI_DAILY_LIMIT: "x" })).toEqual({ perIpHourly: 5, daily: 150 });
  });
});

describe("clientIp", () => {
  it("uses the first X-Forwarded-For hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("falls back to X-Real-IP, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
