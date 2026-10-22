import { describe, expect, it } from "vitest";
import { analyzeLocally } from "@/lib/analyzer";
import { buildTrackEvent } from "@/lib/telemetry";
import { SCENARIOS } from "@/data/scenarios";

describe("indicators telemetry", () => {
  const secret = "Maria Silva, CPF 123.456.789-00, leaked the payroll of ACME";

  it("never sends the incident text or any free-text field", () => {
    const result = analyzeLocally(secret);
    const json = JSON.stringify(buildTrackEvent(result, { inputChars: secret.length, fallback: true }));
    expect(json).not.toContain("Maria");
    expect(json).not.toContain(result.incident_title);
    expect(json).not.toContain(result.incident_summary);
    expect(json).not.toContain(result.remediation_plan.step_1_containment);
    for (const e of result.audit_evidence_required) expect(json).not.toContain(e);
  });

  it("free text is reported as a custom incident", () => {
    const ev = buildTrackEvent(analyzeLocally(secret), { inputChars: secret.length, fallback: false });
    expect(ev.scenario).toBe("custom");
    expect(ev.input_chars).toBe(secret.length);
  });

  it.each(SCENARIOS.map((s) => [s.archetype, s] as const))("scenario %s keeps its id and structured fields", (_a, s) => {
    const r = analyzeLocally(s.description, s.archetype);
    const ev = buildTrackEvent(r, { archetype: s.archetype, inputChars: s.description.length, fallback: true });
    expect(ev.scenario).toBe(s.archetype);
    expect(ev.result.severity_level).toBe(r.severity_level);
    expect(ev.result.failure_category).toBe(r.failure_category);
    expect(ev.result.grounded_frameworks.iso_27001_2022.control_id).toBe(r.grounded_frameworks.iso_27001_2022.control_id);
    expect(ev.result.evidence_items).toBe(r.audit_evidence_required.length);
  });
});
