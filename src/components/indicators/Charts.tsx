"use client";

import { useState } from "react";
import type { DailyPoint } from "@/types/indicators";

export function pct(v: number | null | undefined, digits?: number): string {
  if (v === null || v === undefined) return "—";
  const p = v * 100;
  return `${p.toFixed(digits ?? (p > 0 && p < 9.95 ? 1 : 0))}%`;
}

export function num(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : v.toLocaleString("en-US");
}

/** Section card used by every block of the dashboard. */
export function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-5 ${className}`}>
      <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-accent">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export interface BarItem {
  label: string;
  sub?: string;
  value: number;
  /** Text shown at the end of the bar (defaults to the value). */
  display?: string;
  /** Tailwind background class for the bar fill (defaults to the cyan accent). */
  fill?: string;
}

/** Horizontal bars — one hue for magnitude, value labelled at the end, track for scale. */
export function BarList({ items, max, empty = "No data yet." }: { items: BarItem[]; max?: number; empty?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  if (!items.length || items.every((i) => i.value === 0)) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label + (it.sub ?? "")} title={`${it.label}${it.sub ? ` — ${it.sub}` : ""}: ${it.display ?? it.value}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-200">
              {it.label}
              {it.sub ? <span className="ml-2 text-xs text-slate-500">{it.sub}</span> : null}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-300">{it.display ?? num(it.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line/70">
            <div
              className={`h-2 rounded-full ${it.fill ?? "bg-accent-strong"}`}
              style={{ width: `${Math.max(it.value > 0 ? 2 : 0, (it.value / top) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Analyses per day — single series, column per day, crosshair tooltip on hover / focus. */
export function DailyChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  const step = data.length > 120 ? 30 : data.length > 40 ? 7 : data.length > 10 ? 5 : 1;
  const shown = active === null ? null : data[active];
  return (
    <div>
      <div className="mb-2 flex h-10 items-end justify-between gap-4 text-xs text-slate-400">
        {shown ? (
          <div>
            <span className="font-semibold text-slate-100">{shown.day}</span> · {shown.total} analyses ({shown.ai} AI ·{" "}
            {shown.demo} demo) · {shown.high_critical} High/Critical
            {shown.ai_rate_limited ? ` · ${shown.ai_rate_limited} AI requests rate-limited` : ""}
          </div>
        ) : (
          <div>Hover or focus a day for details.</div>
        )}
        <div className="shrink-0 font-mono tabular-nums">max {max}/day</div>
      </div>
      <div className="relative">
        {/* recessive gridlines at 50% and 100% */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line/60" />
        <div
          className="flex h-40 items-end gap-[2px] border-b border-slate-700"
          role="img"
          aria-label={`Analyses per day over ${data.length} days, peak ${max}`}
          onMouseLeave={() => setActive(null)}
        >
          {data.map((d, i) => (
            <div
              key={d.day}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
              aria-label={`${d.day}: ${d.total} analyses`}
            >
              <div
                className={`w-full rounded-t-[4px] transition-colors ${
                  active === i ? "bg-accent" : "bg-accent-strong/80 group-hover:bg-accent"
                }`}
                style={{ height: d.total ? `${Math.max(3, (d.total / max) * 100)}%` : "0%" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] text-slate-500">
        {data.map((d, i) => (
          <div key={d.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
            {i % step === 0 ? d.day.slice(5) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

/** Risk heat map: failure category × severity, one-hue intensity by count, every cell labelled. */
export function HeatMap({ matrix, categories }: { matrix: Record<string, Partial<Record<string, number>>>; categories: string[] }) {
  const max = Math.max(1, ...categories.flatMap((c) => SEVERITIES.map((s) => matrix[c]?.[s] ?? 0)));
  if (!categories.length) return <p className="text-sm text-slate-500">No data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[440px] border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr>
            <th className="text-left font-medium text-slate-500">Failure category</th>
            {SEVERITIES.map((s) => (
              <th key={s} className="w-[15%] text-center font-medium text-slate-400">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c}>
              <th className="pr-2 text-left font-normal text-slate-300">{c}</th>
              {SEVERITIES.map((s) => {
                const n = matrix[c]?.[s] ?? 0;
                const a = n ? 0.15 + 0.85 * (n / max) : 0;
                return (
                  <td
                    key={s}
                    title={`${c} · ${s}: ${n}`}
                    className="h-9 rounded-[4px] text-center font-mono tabular-nums"
                    style={{
                      background: n ? `rgba(6, 182, 212, ${a.toFixed(2)})` : "rgba(31, 41, 55, 0.5)",
                      color: a > 0.55 ? "#0a0a1a" : "#e5e7eb",
                    }}
                  >
                    {n || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
