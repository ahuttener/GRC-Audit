import type { AuditResponse } from "@/types/grc";

/** Escape text for HTML — every field may come from the LLM, so nothing is trusted. */
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SEVERITY_COLOR: Record<string, string> = {
  Low: "#16a34a",
  Medium: "#ca8a04",
  High: "#ea580c",
  Critical: "#dc2626",
};

/**
 * Render an AuditResponse as a standalone, print-ready HTML audit report (A4) with the
 * CyberSecInfo emblem. The browser's print dialog turns it into a PDF ("Save as PDF").
 */
export function toReportHtml(resp: AuditResponse, logoUrl: string, generatedAt: Date = new Date()): string {
  const r = resp.result;
  const gf = r.grounded_frameworks;
  const v = resp.verification;
  const sev = SEVERITY_COLOR[r.severity_level] ?? "#475569";
  const engine = resp.source === "llm" ? `LLM (${resp.model ?? "model"})` : "Local demo engine";
  const date = generatedAt.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  const rows: [string, string, string, string][] = [
    ["NIST CSF 2.0", gf.nist_csf_2.subcategories, gf.nist_csf_2.function_name, ""],
    ["ISO/IEC 27001:2022", gf.iso_27001_2022.control_id, gf.iso_27001_2022.control_name, gf.iso_27001_2022.audit_finding],
    ["SOC 2", gf.soc_2.criteria, gf.soc_2.name, gf.soc_2.audit_finding],
    ["GDPR", gf.gdpr.article, gf.gdpr.name, gf.gdpr.regulatory_risk],
    ["CCPA/CPRA", gf.ccpa_cpra.section, gf.ccpa_cpra.name, gf.ccpa_cpra.regulatory_risk],
    ["HIPAA", gf.hipaa.rule, gf.hipaa.name, gf.hipaa.regulatory_risk],
    [
      "AIUC-1 (AI agents)",
      gf.aiuc_1?.requirements ?? "N/A",
      gf.aiuc_1?.name ?? "AI agent standard",
      gf.aiuc_1?.audit_finding ?? "Not applicable — no AI system or agent is involved.",
    ],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GRC Audit Report — ${esc(r.incident_title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10.5pt/1.5 Roboto, "Segoe UI", Arial, sans-serif; color: #0f172a; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; border-bottom: 3px solid #06b6d4; }
  header img { width: 64px; height: 64px; border-radius: 50%; }
  .brand { font-size: 9pt; letter-spacing: .12em; text-transform: uppercase; color: #0891b2; font-weight: 700; }
  h1 { margin: 2px 0 0; font-size: 17pt; line-height: 1.25; }
  .meta { margin-left: auto; text-align: right; font-size: 8.5pt; color: #475569; white-space: nowrap; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 4px; }
  .chip { border: 1px solid #cbd5e1; border-radius: 999px; padding: 2px 10px; font-size: 8.5pt; }
  .sev { color: #fff; border: 0; background: ${sev}; font-weight: 700; }
  .ok { color: #047857; border-color: #6ee7b7; background: #ecfdf5; }
  .warn { color: #b45309; border-color: #fcd34d; background: #fffbeb; }
  h2 { margin: 16px 0 6px; font-size: 11.5pt; color: #0e7490; text-transform: uppercase; letter-spacing: .06em; }
  p { margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; }
  td.id { font-family: Consolas, "Courier New", monospace; white-space: nowrap; color: #0e7490; }
  tr { page-break-inside: avoid; }
  ul { margin: 0; padding-left: 18px; }
  ol.steps { margin: 0; padding-left: 18px; }
  ol.steps li { margin-bottom: 6px; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #64748b; }
</style>
</head>
<body>
<header>
  <img src="${esc(logoUrl)}" alt="CyberSecInfo">
  <div>
    <div class="brand">CyberSecInfo · GRC Audit Report</div>
    <h1>${esc(r.incident_title)}</h1>
  </div>
  <div class="meta">${esc(date)}<br>${esc(engine)}</div>
</header>

<div class="chips">
  <span class="chip sev">Severity: ${esc(r.severity_level)}</span>
  <span class="chip">${esc(r.failure_category)}</span>
  <span class="chip">Strategy: ${esc(r.recommended_strategy?.strategy ?? "MITIGATE")}</span>
  ${
    v.grounded
      ? `<span class="chip ok">Grounded — ${v.verified.length} cited IDs verified</span>`
      : `<span class="chip warn">${v.unverified.length} unverified ID(s): ${esc(v.unverified.join(", "))}</span>`
  }
</div>

<h2>Executive summary</h2>
<p>${esc(r.incident_summary)}</p>
${r.recommended_strategy?.rationale ? `<p><strong>Recommended treatment:</strong> ${esc(r.recommended_strategy.strategy)} — ${esc(r.recommended_strategy.rationale)}</p>` : ""}

<h2>Grounded framework mapping</h2>
<table>
  <thead><tr><th>Framework</th><th>Control / article</th><th>Name</th><th>Finding / regulatory risk</th></tr></thead>
  <tbody>
    ${rows.map(([fw, id, name, note]) => `<tr><td>${esc(fw)}</td><td class="id">${esc(id)}</td><td>${esc(name)}</td><td>${esc(note)}</td></tr>`).join("\n    ")}
  </tbody>
</table>

<h2>Audit evidence required</h2>
<ul>
  ${r.audit_evidence_required.map((e) => `<li>${esc(e)}</li>`).join("\n  ")}
</ul>

<h2>Remediation plan</h2>
<ol class="steps">
  <li><strong>Immediate containment.</strong> ${esc(r.remediation_plan.step_1_containment)}</li>
  <li><strong>Data-leak investigation &amp; legal.</strong> ${esc(r.remediation_plan.step_2_leak_and_legal)}</li>
  <li><strong>Permanent systemic fix.</strong> ${esc(r.remediation_plan.step_3_permanent_fix)}</li>
</ol>

<footer>
  Generated by GRC Audit — cybersecinfo.com/grcaudit. Control IDs are checked against embedded official
  catalogs; automated output is an indicator, not legal advice — confirm with a qualified assessor.
</footer>
</body>
</html>`;
}
