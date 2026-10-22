import type { Indicators, Kri, KriStatus } from "@/types/indicators";
import { esc } from "@/lib/toReportHtml";

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

const STATUS: Record<KriStatus, { label: string; fg: string; bg: string; border: string }> = {
  green: { label: "Within appetite", fg: "#047857", bg: "#ecfdf5", border: "#6ee7b7" },
  amber: { label: "Within tolerance", fg: "#b45309", bg: "#fffbeb", border: "#fcd34d" },
  red: { label: "Beyond tolerance", fg: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" },
  no_data: { label: "No data", fg: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
};

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const p = v * 100;
  return `${p.toFixed(p > 0 && p < 9.95 ? 1 : 0)}%`;
}

function kriValue(k: Kri, v: number | null): string {
  if (v === null) return "—";
  return k.unit === "ms" ? `${(v / 1000).toFixed(1)} s` : pct(v);
}

/** Plain-language findings for the executive summary, derived from the numbers only. */
export function summarize(d: Indicators): string[] {
  const k = d.kpis;
  if (!k.analyses) return ["No analyses were recorded in this period, so no indicator can be assessed yet."];
  const count = (s: KriStatus) => d.kri.filter((x) => x.status === s).length;
  const out = [
    `${k.analyses} incident${k.analyses === 1 ? "" : "s"} analysed: ${count("red")} KRI(s) beyond tolerance, ${count(
      "amber",
    )} within tolerance and ${count("green")} within appetite${
      count("no_data") ? ` (${count("no_data")} without data in this period)` : ""
    }.`,
  ];
  const red = d.kri.filter((x) => x.status === "red").map((x) => `${x.id} ${x.name} (${kriValue(x, x.value)})`);
  if (red.length) out.push(`Escalate: ${red.join("; ")}.`);

  let hot: { c: string; s: string; n: number } | null = null;
  for (const [c, row] of Object.entries(d.risk.severity_by_category)) {
    for (const s of SEVERITIES) {
      const n = row[s] ?? 0;
      if (n && (!hot || n > hot.n || (n === hot.n && SEVERITIES.indexOf(s) > SEVERITIES.indexOf(hot.s as never)))) {
        hot = { c, s, n };
      }
    }
  }
  if (hot) out.push(`Highest concentration of exposure: ${hot.c} at ${hot.s} severity (${hot.n} incident${hot.n === 1 ? "" : "s"}).`);

  const iso = d.frameworks.find((f) => f.key === "iso_27001_2022")?.top_controls[0];
  if (iso) out.push(`Most frequently failed ISO/IEC 27001 control: ${iso.id} ${iso.name} (${iso.count} incident${iso.count === 1 ? "" : "s"}).`);
  if (k.breach_notification_rate) {
    out.push(`${pct(k.breach_notification_rate)} of incidents triggered a statutory breach notification (GDPR Art. 33/34, CCPA, HIPAA).`);
  }
  return out;
}

/**
 * Render the indicators as a standalone, print-ready A4 Key Risk Indicator report with the
 * CyberSecInfo emblem — the board / risk-committee view of the dashboard.
 */
export function toIndicatorsReportHtml(
  d: Indicators,
  opts: { logoUrl: string; datasetLabel: string; generatedAt?: Date },
): string {
  const date = (opts.generatedAt ?? new Date()).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const period =
    d.dataset === "examples"
      ? "Curated example library (baseline)"
      : d.window.from
        ? `${d.window.from} → ${d.window.to}`
        : `All history → ${d.window.to}`;
  const k = d.kpis;
  const categories = d.risk.failure_category.map((c) => c.key);
  const maxCell = Math.max(1, ...categories.flatMap((c) => SEVERITIES.map((s) => d.risk.severity_by_category[c]?.[s] ?? 0)));

  const kpis: [string, string][] = [
    ["Incidents analysed", `${k.analyses} (${k.ai_analyses} AI · ${k.demo_analyses} demo engine)`],
    ["High / Critical", pct(k.high_critical_rate)],
    ["Grounded analyses", pct(k.grounded_rate)],
    ["Verified controls per analysis", k.avg_controls_per_analysis?.toFixed(1) ?? "—"],
    ["Control-catalog coverage", pct(k.catalog_coverage)],
    ["Breach-notification triggers", pct(k.breach_notification_rate)],
    ["AI system involved (AIUC-1)", pct(k.ai_system_involvement_rate)],
    ["Audit evidence items per incident", k.avg_evidence_items?.toFixed(1) ?? "—"],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Key Risk Indicator Report — GRC Audit</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10pt/1.5 Roboto, "Segoe UI", Arial, sans-serif; color: #0f172a; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; border-bottom: 3px solid #06b6d4; }
  header img { width: 64px; height: 64px; border-radius: 50%; }
  .brand { font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; color: #0891b2; font-weight: 700; }
  h1 { margin: 2px 0 0; font-size: 17pt; line-height: 1.25; }
  .meta { margin-left: auto; text-align: right; font-size: 8.5pt; color: #475569; white-space: nowrap; }
  h2 { margin: 16px 0 6px; font-size: 11.5pt; color: #0e7490; text-transform: uppercase; letter-spacing: .06em;
    break-after: avoid; page-break-after: avoid; }
  p { margin: 0 0 6px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
  th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.id { font-family: Consolas, "Courier New", monospace; white-space: nowrap; color: #0e7490; }
  td.heat { text-align: center; font-variant-numeric: tabular-nums; width: 13%; }
  .status { display: inline-block; border: 1px solid; border-radius: 999px; padding: 0 8px; font-size: 8pt; font-weight: 700; white-space: nowrap; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  tr, .keep { page-break-inside: avoid; }
  .muted { color: #64748b; font-size: 8.5pt; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #64748b; }
</style>
</head>
<body>
<header>
  <img src="${esc(opts.logoUrl)}" alt="CyberSecInfo">
  <div>
    <div class="brand">CyberSecInfo · GRC Audit</div>
    <h1>Key Risk Indicator Report</h1>
    <div class="muted">${esc(opts.datasetLabel)} · ${esc(period)}</div>
  </div>
  <div class="meta">${esc(date)}<br>Indicators API v${esc(d.version)}</div>
</header>

<h2>Executive summary</h2>
<ul>
  ${summarize(d).map((s) => `<li>${esc(s)}</li>`).join("\n  ")}
</ul>

<h2>Key risk indicators</h2>
<table class="keep">
  <thead><tr><th>ID</th><th>Indicator</th><th class="num">Value</th><th class="num">Appetite</th><th class="num">Tolerance</th><th>Status</th></tr></thead>
  <tbody>
    ${d.kri
      .map((x) => {
        const s = STATUS[x.status] ?? STATUS.no_data;
        const op = x.better === "higher" ? "≥" : "≤";
        return `<tr><td class="id">${esc(x.id)}</td><td><strong>${esc(x.name)}</strong><br><span class="muted">${esc(x.description)}</span></td><td class="num">${esc(kriValue(x, x.value))}</td><td class="num">${op} ${esc(kriValue(x, x.appetite))}</td><td class="num">${op} ${esc(kriValue(x, x.tolerance))}</td><td><span class="status" style="color:${s.fg};background:${s.bg};border-color:${s.border}">${esc(s.label)}</span></td></tr>`;
      })
      .join("\n    ")}
  </tbody>
</table>
<p class="muted">Appetite = target; tolerance = maximum acceptable deviation (ISO 31000 / COSO ERM). Thresholds are illustrative and configurable — in an organisation they come from its risk-appetite statement.</p>

<h2>Key metrics</h2>
<table class="keep">
  <tbody>
    ${[0, 2, 4, 6].map((i) => `<tr><th>${esc(kpis[i][0])}</th><td class="num">${esc(kpis[i][1])}</td><th>${esc(kpis[i + 1][0])}</th><td class="num">${esc(kpis[i + 1][1])}</td></tr>`).join("\n    ")}
  </tbody>
</table>

<h2>Risk heat map — failure category × severity</h2>
<table class="keep">
  <thead><tr><th>Failure category</th>${SEVERITIES.map((s) => `<th class="num">${s}</th>`).join("")}</tr></thead>
  <tbody>
    ${categories
      .map(
        (c) =>
          `<tr><td>${esc(c)}</td>${SEVERITIES.map((s) => {
            const n = d.risk.severity_by_category[c]?.[s] ?? 0;
            const a = n ? 0.15 + 0.75 * (n / maxCell) : 0;
            return `<td class="heat" style="background:rgba(6,182,212,${a.toFixed(2)});${a > 0.55 ? "font-weight:700" : ""}">${esc(n || "")}</td>`;
          }).join("")}</tr>`,
      )
      .join("\n    ") || `<tr><td colspan="5" class="muted">No data.</td></tr>`}
  </tbody>
</table>

<div class="grid">
  <div class="keep">
    <h2>Severity</h2>
    <table><tbody>
      ${d.risk.severity.map((s) => `<tr><td>${esc(s.key)}</td><td class="num">${esc(s.count)}</td><td class="num">${esc(pct(s.share))}</td></tr>`).join("")}
    </tbody></table>
  </div>
  <div class="keep">
    <h2>Risk treatment (ISO 31000)</h2>
    <table><tbody>
      ${d.risk.risk_strategy.map((s) => `<tr><td>${esc(s.key)}</td><td class="num">${esc(s.count)}</td><td class="num">${esc(pct(s.share))}</td></tr>`).join("")}
    </tbody></table>
  </div>
</div>

<h2>Framework applicability &amp; control coverage</h2>
<table class="keep">
  <thead><tr><th>Framework</th><th class="num">In scope</th><th class="num">Avg controls</th><th class="num">Controls exercised</th><th class="num">Coverage</th><th class="num">Never cited</th></tr></thead>
  <tbody>
    ${d.frameworks
      .map(
        (f) =>
          `<tr><td>${esc(f.label)}</td><td class="num">${esc(pct(f.applicability_rate))}</td><td class="num">${esc(f.avg_citations_when_applicable?.toFixed(1) ?? "—")}</td><td class="num">${esc(f.distinct_controls_cited)} / ${esc(f.catalog_size)}</td><td class="num">${esc(pct(f.catalog_coverage))}</td><td class="num">${esc(f.never_cited)}</td></tr>`,
      )
      .join("\n    ")}
  </tbody>
</table>

<h2>Most frequently failed controls</h2>
<table>
  <thead><tr><th>Framework</th><th>Control</th><th>Name</th><th class="num">Incidents</th></tr></thead>
  <tbody>
    ${d.frameworks
      .flatMap((f) =>
        f.top_controls
          .slice(0, 3)
          .map((c) => `<tr><td>${esc(f.label)}</td><td class="id">${esc(c.id)}</td><td>${esc(c.name)}</td><td class="num">${esc(c.count)}</td></tr>`),
      )
      .join("\n    ") || `<tr><td colspan="4" class="muted">No data.</td></tr>`}
  </tbody>
</table>

<footer>
  Generated by GRC Audit — cybersecinfo.com/grcaudit/indicators. Source: GRC Indicators API (aggregated, anonymous
  metrics; no incident text or IP addresses are stored). Control IDs are verified against the official catalogs;
  automated output is an indicator, not legal advice.
</footer>
</body>
</html>`;
}
