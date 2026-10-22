"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Download,
  FileJson,
  Lock,
  MinusCircle,
  RefreshCw,
  XOctagon,
} from "lucide-react";
import type { Indicators, Kri, KriStatus } from "@/types/indicators";
import { SCENARIOS } from "@/data/scenarios";
import { BarList, DailyChart, HeatMap, Panel, num, pct } from "./Charts";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
// Set by the Hostinger bundle (the API is PHP). Elsewhere (e.g. the GitHub Pages mirror) the
// page explains where the live indicators run.
const API_PATH = process.env.NEXT_PUBLIC_INDICATORS_URL || "";
const API_URL = API_PATH ? `${BASE_PATH}/${API_PATH}` : "";
const LIVE = "https://cybersecinfo.com/grcaudit/indicators/";

const WINDOWS = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "12 months" },
  { key: "all", label: "All time" },
];

const SCENARIO_TITLE = Object.fromEntries(SCENARIOS.map((s) => [s.archetype, s.title]));

// Status colours are reserved for KRI state and always ship with an icon and a label.
const STATUS: Record<KriStatus, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  green: { label: "Within appetite", icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/30" },
  amber: { label: "Within tolerance", icon: AlertTriangle, cls: "text-amber-300 bg-amber-500/10 ring-amber-400/30" },
  red: { label: "Beyond tolerance", icon: XOctagon, cls: "text-red-300 bg-red-500/10 ring-red-400/30" },
  no_data: { label: "No data yet", icon: MinusCircle, cls: "text-slate-400 bg-slate-500/10 ring-slate-400/20" },
};

const SEVERITY_FILL: Record<string, string> = {
  Low: "bg-emerald-500",
  Medium: "bg-yellow-400",
  High: "bg-orange-500",
  Critical: "bg-red-500",
};

const FAILURE_LABEL: Record<string, string> = {
  rate_limited_ip: "Rate limit — per visitor (credit protection)",
  rate_limited_daily: "Rate limit — daily cap (credit protection)",
  input_error: "Input rejected (too short or too long)",
  not_configured: "AI not configured",
  ai_error: "AI provider unavailable",
  ai_incomplete: "AI answer incomplete",
  invalid_output: "Invalid AI output (schema)",
  catalog_missing: "Framework catalogs missing",
};

function kriValue(k: Kri, v: number | null): string {
  if (v === null) return "—";
  return k.unit === "ms" ? `${(v / 1000).toFixed(1)} s` : pct(v);
}

function KriCard({ k }: { k: Kri }) {
  const s = STATUS[k.status];
  const Icon = s.icon;
  const op = k.better === "higher" ? "≥" : "≤";
  return (
    <div className="flex flex-col rounded-xl border border-line bg-panel2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-500">{k.id}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${s.cls}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {s.label}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{k.name}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-100">{kriValue(k, k.value)}</div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-400">{k.description}</p>
      <div className="mt-3 border-t border-line pt-2 text-[11px] text-slate-500">
        Appetite {op} {kriValue(k, k.appetite)} · Tolerance {op} {kriValue(k, k.tolerance)}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold tabular-nums text-accent">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function ApiPanel({ days }: { days: string }) {
  const [origin, setOrigin] = useState("https://cybersecinfo.com");
  useEffect(() => setOrigin(window.location.origin), []);
  const base = API_URL ? `${origin}${API_URL}` : "https://cybersecinfo.com/grcaudit/api/indicators.php";
  const rows = [
    { label: "JSON — every indicator", href: `${base}?days=${days}` },
    { label: "CSV — summary (metric, value)", href: `${base}?days=${days}&format=csv&table=summary` },
    { label: "CSV — daily series", href: `${base}?days=${days}&format=csv&table=daily` },
    { label: "CSV — control citations", href: `${base}?days=${days}&format=csv&table=controls` },
    { label: "CSV — scenarios", href: `${base}?days=${days}&format=csv&table=scenarios` },
    { label: `JSON — example library baseline (${SCENARIOS.length} incidents)`, href: `${base}?dataset=examples` },
  ];
  return (
    <Panel title="Indicators API" hint="Read-only REST endpoint, no key needed for the public aggregates. Cached for 60 s.">
      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.label}>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-slate-200 hover:text-accent"
              >
                <Download className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-accent" aria-hidden="true" />
                {r.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href={`${BASE_PATH}/indicators-openapi.json`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-slate-200 hover:text-accent"
            >
              <FileJson className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-accent" aria-hidden="true" />
              OpenAPI 3.1 specification
            </a>
          </li>
        </ul>
        <div className="space-y-3">
          <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-3 font-mono text-[12px] leading-relaxed text-slate-300">
            <span className="text-slate-500"># KRIs as JSON</span>
            {"\n"}curl -s &quot;{base}?days={days}&quot; | jq &apos;.kri[] | {"{"}id, name, value, status{"}"}&apos;
            {"\n\n"}
            <span className="text-slate-500"># Power BI / Excel: Get Data → Web → paste a CSV URL</span>
          </pre>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            Privacy by design (GDPR Art. 25): only structured fields are stored — severity, category, strategy and
            catalog-verified control IDs. No incident text, titles or IP addresses; rate limits use daily HMAC hashes.
          </p>
        </div>
      </div>
    </Panel>
  );
}

const DATASETS = [
  { key: "live", label: "Live usage", hint: "Every incident audited on this site" },
  { key: "examples", label: `Example library (${SCENARIOS.length})`, hint: "Baseline: the curated incidents" },
] as const;
type Dataset = (typeof DATASETS)[number]["key"];

export default function IndicatorsDashboard() {
  const [dataset, setDataset] = useState<Dataset>("live");
  const [days, setDays] = useState("30");
  const [data, setData] = useState<Indicators | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fw, setFw] = useState("iso_27001_2022");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!API_URL) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(dataset === "examples" ? `${API_URL}?dataset=examples` : `${API_URL}?days=${days}`)
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok || !j?.kpis) throw new Error(j?.error || "Indicators are temporarily unavailable.");
        if (alive) setData(j as Indicators);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days, dataset, nonce]);
  const live = dataset === "live";

  const categories = useMemo(
    () => (data ? data.risk.failure_category.map((c) => c.key) : []),
    [data],
  );

  if (!API_URL) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-panel2 p-6 text-sm text-slate-300">
        The live indicators and their API run on the PHP deployment.{" "}
        <a href={LIVE} className="font-semibold text-accent hover:underline">
          Open the live dashboard on cybersecinfo.com
        </a>
        .
      </div>
    );
  }

  const k = data?.kpis;
  const selected = data?.frameworks.find((f) => f.key === fw);

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Dataset" className="grid gap-2 sm:grid-cols-2">
        {DATASETS.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={dataset === d.key}
            onClick={() => setDataset(d.key)}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${
              dataset === d.key
                ? "border-accent bg-accent/10"
                : "border-line bg-panel hover:border-accent/50"
            }`}
          >
            <span className={`block font-display text-sm font-bold uppercase tracking-[0.08em] ${dataset === d.key ? "text-accent" : "text-slate-200"}`}>
              {d.label}
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">{d.hint}</span>
          </button>
        ))}
      </div>

      {!live ? (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-slate-300">
          The {SCENARIOS.length} curated incidents from the GRC Audit page — access control, data leakage, cloud, third
          party, AI agents, identity governance and business continuity — analysed by the grounded engine and run through
          the same indicator model. This is the tool&apos;s reference profile: compare it with live usage to see how real
          incidents differ from the textbook cases.
        </p>
      ) : null}

      {/* Window filter — one row above every chart */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Time window" className={`inline-flex flex-wrap rounded-xl border border-line bg-panel p-1 ${live ? "" : "invisible"}`}>
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setDays(w.key)}
              aria-pressed={days === w.key}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.06em] transition-colors ${
                days === w.key ? "bg-accent-strong text-gray-900" : "text-slate-300 hover:text-accent"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {data ? <span>Updated {new Date(data.generated_at).toLocaleString("en-GB")}</span> : null}
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-slate-300 hover:border-accent/50 hover:text-accent"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {!data && !error ? <p className="text-sm text-slate-500">Loading indicators…</p> : null}

      {data && k ? (
        <>
          {k.analyses === 0 ? (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-slate-300">
              No analyses recorded in this window yet.{" "}
              <a href={`${BASE_PATH}/`} className="font-semibold text-accent hover:underline">
                Audit an incident
              </a>{" "}
              and it will appear here within a minute.
            </div>
          ) : null}

          <Panel
            title="Key Risk Indicators"
            hint="Each KRI is measured against a risk appetite (target) and a tolerance (maximum acceptable deviation), as in ISO 31000 / COSO ERM."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.kri.map((x) => (
                <KriCard key={x.id} k={x} />
              ))}
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Analyses" value={num(k.analyses)} sub={`${num(k.ai_analyses)} AI · ${num(k.demo_analyses)} demo`} />
            <Stat label="High / Critical" value={pct(k.high_critical_rate)} sub="of analysed incidents" />
            <Stat label="Grounded" value={pct(k.grounded_rate)} sub="every cited ID verified" />
            <Stat label="Controls / analysis" value={k.avg_controls_per_analysis?.toFixed(1) ?? "—"} sub="verified citations, 7 frameworks" />
            <Stat label="Catalog coverage" value={pct(k.catalog_coverage)} sub="official controls exercised" />
            <Stat label="Breach notification" value={pct(k.breach_notification_rate)} sub="GDPR 33/34 · CCPA · HIPAA" />
            <Stat label="AI system involved" value={pct(k.ai_system_involvement_rate)} sub="AIUC-1 in scope" />
            <Stat label="Custom incidents" value={pct(k.custom_incident_share)} sub="free text vs. curated examples" />
          </div>

          {live ? (
          <Panel title="Analyses per day" hint="Every analysis, AI and demo engine.">
            <DailyChart data={data.daily} />
            <details className="mt-4 text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300 hover:text-accent">View as table</summary>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
                <table className="w-full text-left tabular-nums">
                  <thead className="sticky top-0 bg-panel2 text-slate-400">
                    <tr>
                      <th className="px-3 py-1.5">Day</th>
                      <th className="px-3 py-1.5 text-right">Total</th>
                      <th className="px-3 py-1.5 text-right">AI</th>
                      <th className="px-3 py-1.5 text-right">Demo</th>
                      <th className="px-3 py-1.5 text-right">High/Critical</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.daily].reverse().map((d) => (
                      <tr key={d.day} className="border-t border-line/60">
                        <td className="px-3 py-1">{d.day}</td>
                        <td className="px-3 py-1 text-right">{d.total}</td>
                        <td className="px-3 py-1 text-right">{d.ai}</td>
                        <td className="px-3 py-1 text-right">{d.demo}</td>
                        <td className="px-3 py-1 text-right">{d.high_critical}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Panel>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="Risk heat map" hint="Failure category × severity — where the exposure concentrates." className="lg:col-span-3">
              <HeatMap matrix={data.risk.severity_by_category} categories={categories} />
            </Panel>
            <div className="space-y-6 lg:col-span-2">
              <Panel title="Severity">
                <BarList
                  items={data.risk.severity.map((s) => ({
                    label: s.key,
                    value: s.count,
                    display: `${s.count} · ${pct(s.share)}`,
                    fill: SEVERITY_FILL[s.key],
                  }))}
                />
              </Panel>
              <Panel title="Risk treatment" hint="ISO 31000 strategy recommended per incident.">
                <BarList items={data.risk.risk_strategy.map((s) => ({ label: s.key, value: s.count, display: `${s.count} · ${pct(s.share)}` }))} />
              </Panel>
            </div>
          </div>

          <Panel title="Framework applicability & control coverage" hint="How often each framework is in scope, and how much of its official catalog has been exercised.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
                <thead className="text-xs uppercase tracking-[0.08em] text-slate-400">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Framework</th>
                    <th className="py-2 pr-3 text-right font-medium">In scope</th>
                    <th className="py-2 pr-3 text-right font-medium">Avg controls</th>
                    <th className="py-2 pr-3 font-medium">Catalog coverage</th>
                    <th className="py-2 text-right font-medium">Never cited</th>
                  </tr>
                </thead>
                <tbody>
                  {data.frameworks.map((f) => (
                    <tr key={f.key} className="border-t border-line">
                      <td className="py-2.5 pr-3 font-medium text-slate-100">{f.label}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-300">{pct(f.applicability_rate)}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-300">{f.avg_citations_when_applicable?.toFixed(1) ?? "—"}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full max-w-[220px] rounded-full bg-line/70">
                            <div
                              className="h-2 rounded-full bg-accent-strong"
                              style={{ width: `${(f.catalog_coverage ?? 0) * 100}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs text-slate-300">
                            {f.distinct_controls_cited}/{f.catalog_size} · {pct(f.catalog_coverage)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-slate-400">{f.never_cited}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Most-cited controls" hint="Top 10 catalog-verified controls per framework — the control areas that fail most often.">
            <div role="tablist" aria-label="Framework" className="mb-4 flex flex-wrap gap-2">
              {data.frameworks.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={fw === f.key}
                  onClick={() => setFw(f.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    fw === f.key
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-line text-slate-300 hover:border-accent/50 hover:text-accent"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <BarList
              items={(selected?.top_controls ?? []).map((c) => ({
                label: c.id,
                sub: c.name,
                value: c.count,
                display: `${c.count} · ${pct(c.share_of_applicable)}`,
              }))}
              empty="No citations for this framework in the window."
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="ISO 27001 themes">
              <BarList items={data.control_families.iso_themes.map((c) => ({ label: c.key, value: c.count, display: `${c.count} · ${pct(c.share)}` }))} />
            </Panel>
            <Panel title="NIST CSF 2.0 functions">
              <BarList items={data.control_families.nist_functions.map((c) => ({ label: c.key, value: c.count, display: `${c.count} · ${pct(c.share)}` }))} />
            </Panel>
            <Panel title="SOC 2 criteria series">
              <BarList items={data.control_families.soc2_series.map((c) => ({ label: c.key, value: c.count, display: `${c.count} · ${pct(c.share)}` }))} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Failure categories">
              <BarList items={data.risk.failure_category.map((c) => ({ label: c.key, value: c.count, display: `${c.count} · ${pct(c.share)}` }))} />
            </Panel>
            <Panel
              title="Scenarios"
              hint={`${num(data.scenarios.custom_incidents)} custom incidents · ${num(data.scenarios.scenario_runs)} curated example runs (${data.scenarios.distinct_scenarios} distinct)`}
            >
              <BarList
                items={data.scenarios.top.slice(0, 10).map((s) => ({
                  label: SCENARIO_TITLE[s.key] ?? s.key,
                  value: s.count,
                  display: `${s.count} · ${pct(s.share)}`,
                }))}
              />
            </Panel>
          </div>

          {live ? (
          <Panel title="Operations" hint="Service health of the AI engine behind the analyses.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="AI success" value={pct(data.operations.ai_success_rate)} sub={`${num(data.operations.ai_attempts)} AI attempts`} />
              <Stat
                label="Latency p50 / p95"
                value={
                  data.operations.latency_ms.p50 === null
                    ? "—"
                    : `${(data.operations.latency_ms.p50 / 1000).toFixed(1)} / ${((data.operations.latency_ms.p95 ?? 0) / 1000).toFixed(1)} s`
                }
              />
              <Stat label="Demo fallbacks" value={num(data.operations.demo_fallbacks)} sub="AI unavailable or rate-limited" />
              <Stat label="Avg incident length" value={data.operations.avg_input_chars ? `${num(data.operations.avg_input_chars)} ch` : "—"} />
            </div>
            {Object.keys(data.operations.ai_not_completed).length ? (
              <div className="mt-5">
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  AI requests not completed, by reason
                </h4>
                <BarList
                  items={Object.entries(data.operations.ai_not_completed)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, n]) => ({ label: FAILURE_LABEL[key] ?? key.replace(/_/g, " "), value: n }))}
                />
              </div>
            ) : null}
          </Panel>
          ) : null}

          <ApiPanel days={days} />

          <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-600">
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            {data.api} v{data.version} · window {data.window.from ?? "start"} → {data.window.to}
          </p>
        </>
      ) : null}
    </div>
  );
}
