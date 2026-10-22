import { describe, expect, it } from "vitest";
import type { Indicators, Kri } from "@/types/indicators";
import { summarize, toIndicatorsReportHtml } from "@/lib/toIndicatorsReportHtml";
import type { AuditResponse } from "@/types/grc";
import { toCombinedReportHtml } from "@/lib/toCombinedReportHtml";
import { isAuditResponse } from "@/lib/lastAudit";
import { analyzeLocally } from "@/lib/analyzer";
import { verify } from "@/lib/grounding";

const kri = (id: string, status: Kri["status"], value: number | null): Kri => ({
  id,
  name: `Name ${id}`,
  description: "d",
  value,
  unit: "ratio",
  better: "lower",
  appetite: 0.4,
  tolerance: 0.6,
  status,
});

function fixture(analyses = 10): Indicators {
  return {
    api: "GRC Audit Indicators",
    version: 1,
    dataset: "live",
    generated_at: "2026-10-22T12:00:00+00:00",
    window: { days: 30, from: "2026-09-23", to: "2026-10-22" },
    privacy: "",
    kpis: {
      analyses,
      ai_analyses: 4,
      demo_analyses: analyses - 4,
      ai_share: 0.4,
      custom_incident_share: 0.5,
      high_critical_rate: 0.8,
      grounded_rate: 1,
      unverified_citation_rate: 0,
      avg_controls_per_analysis: 11.5,
      catalog_coverage: 0.24,
      breach_notification_rate: 0.3,
      ai_system_involvement_rate: 0.1,
      avg_evidence_items: 5,
      active_days: 3,
      avg_analyses_per_active_day: 3.3,
    },
    daily: [],
    risk: {
      severity: [{ key: "High", count: 6, share: 0.6 }],
      failure_category: [{ key: "Identity & Access Management", count: 7, share: 0.7 }, { key: "Data Leakage", count: 3, share: 0.3 }],
      risk_strategy: [{ key: "MITIGATE", count: 10, share: 1 }],
      severity_by_category: { "Identity & Access Management": { High: 6, Critical: 1 }, "Data Leakage": { Critical: 3 } },
    },
    frameworks: [
      {
        key: "iso_27001_2022",
        label: "ISO/IEC 27001:2022",
        catalog_size: 93,
        applicable_analyses: 10,
        applicability_rate: 1,
        citations: 25,
        unverified_citations: 0,
        avg_citations_when_applicable: 2.5,
        distinct_controls_cited: 9,
        catalog_coverage: 0.097,
        never_cited: 84,
        top_controls: [{ id: "A.5.18", name: "Access rights <script>", count: 7, share_of_applicable: 0.7 }],
      },
    ],
    control_families: { iso_themes: [], nist_functions: [], soc2_series: [] },
    scenarios: { scenario_runs: 5, custom_incidents: 5, distinct_scenarios: 2, top: [] },
    operations: {
      ai_attempts: 4,
      ai_success_rate: 1,
      demo_fallbacks: 0,
      ai_not_completed: {},
      latency_ms: { p50: null, p95: null, avg: null },
      avg_input_chars: 200,
    },
    kri: [kri("KRI-01", "green", 0.1), kri("KRI-06", "red", 0.8), kri("KRI-07", "amber", 0.5), kri("KRI-03", "no_data", null)],
  };
}

describe("KRI report (PDF)", () => {
  const html = toIndicatorsReportHtml(fixture(), { logoUrl: "https://x/emblem.png", datasetLabel: "Live usage · 30 days" });

  it("lists every KRI with its status label", () => {
    for (const id of ["KRI-01", "KRI-06", "KRI-07", "KRI-03"]) expect(html).toContain(id);
    expect(html).toContain("Beyond tolerance");
    expect(html).toContain("Within appetite");
    expect(html).toContain("No data");
  });

  it("escapes every value coming from the API", () => {
    expect(html).not.toContain("<script>");
    expect(html).toContain("Access rights &lt;script&gt;");
  });

  it("carries the logo, period and dataset", () => {
    expect(html).toContain('src="https://x/emblem.png"');
    expect(html).toContain("2026-09-23 → 2026-10-22");
    expect(html).toContain("Live usage · 30 days");
  });

  it("summary escalates red KRIs and names the hottest cell and the top control", () => {
    const s = summarize(fixture()).join(" ");
    expect(s).toContain("1 KRI(s) beyond tolerance");
    expect(s).toContain("Escalate: KRI-06");
    expect(s).toContain("Identity & Access Management at High severity (6 incidents)");
    expect(s).toContain("A.5.18");
  });

  it("rounds 9.96% to 10%, not 10.0%", () => {
    const d = fixture();
    d.kri = [kri("KRI-02", "amber", 0.0996)];
    const out = toIndicatorsReportHtml(d, { logoUrl: "x", datasetLabel: "x" });
    expect(out).toContain(">10%<");
    expect(out).not.toContain("10.0%");
  });

  it("an empty dataset still renders every section without crashing", () => {
    const d = fixture(0);
    d.frameworks = [];
    d.risk = { severity: [], failure_category: [], risk_strategy: [], severity_by_category: {} };
    const out = toIndicatorsReportHtml(d, { logoUrl: "x", datasetLabel: "x" });
    expect(out).toContain("No analyses were recorded in this period");
    expect(out).toContain("No data.");
  });

  it("an empty period says so instead of inventing findings", () => {
    expect(summarize(fixture(0))).toEqual([
      "No analyses were recorded in this period, so no indicator can be assessed yet.",
    ]);
  });
});

describe("Complete PDF (incident + KRI report)", () => {
  const incident = (title: string): AuditResponse => {
    const result = analyzeLocally("A dismissed employee's account was never disabled and the password leaked.", "zombie-account");
    return { source: "demo", verification: verify(result), result: { ...result, incident_title: title } };
  };

  it("puts the incident first and the KRI report on a new page, in one document", () => {
    const html = toCombinedReportHtml(incident("Zombie account"), fixture(), { logoUrl: "e.png", datasetLabel: "Live usage · 30 days" });
    expect(html.match(/<html/g)).toHaveLength(1);
    expect(html.match(/<body>/g)).toHaveLength(1);
    const a = html.indexOf("Grounded framework mapping");
    const b = html.indexOf("Key Risk Indicator Report</h1>");
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(html.indexOf('class="next-report"')).toBeLessThan(b);
    expect(html).toContain(".sev { color: #fff; border: 0; background:"); // incident-only styles kept
    expect(html).toContain("td.heat"); // KRI-only styles kept
    expect(html).toContain("Live usage · 30 days");
  });

  it("escapes the incident title everywhere, including the document title", () => {
    const html = toCombinedReportHtml(incident('</body><script>x()</script>'), fixture(), { logoUrl: "e.png", datasetLabel: "x" });
    expect(html).not.toContain("<script>");
    expect(html.match(/<\/body>/g)).toHaveLength(1);
  });

  it("only accepts a stored diagnosis with the full shape", () => {
    expect(isAuditResponse(incident("ok"))).toBe(true);
    expect(isAuditResponse(null)).toBe(false);
    expect(isAuditResponse({ result: { incident_title: "x" } })).toBe(false);
    const noPlan = incident("x") as unknown as { result: Record<string, unknown> };
    delete noPlan.result.remediation_plan;
    expect(isAuditResponse(noPlan)).toBe(false);
  });
});
