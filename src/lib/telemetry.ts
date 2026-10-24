// Anonymous indicators for demo-engine analyses (they run in the browser, so the server never sees
// them otherwise). Only structured fields leave the page: severity, category, strategy, the cited
// control-ID fields and counts. Never the incident text, titles, summaries or findings.

import type { AuditResult, GroundedFrameworks } from "@/types/grc";

type IdFields = {
  [K in keyof GroundedFrameworks]-?: Record<string, string>;
};

export interface TrackEvent {
  scenario: string;
  fallback: boolean;
  input_chars: number;
  result: {
    severity_level: string;
    failure_category: string;
    recommended_strategy: { strategy: string };
    evidence_items: number;
    grounded_frameworks: IdFields;
  };
}

export function buildTrackEvent(
  result: AuditResult,
  opts: { archetype?: string; inputChars: number; fallback: boolean },
): TrackEvent {
  const gf = result.grounded_frameworks;
  return {
    scenario: opts.archetype ?? "custom",
    fallback: opts.fallback,
    input_chars: opts.inputChars,
    result: {
      severity_level: result.severity_level,
      failure_category: result.failure_category,
      recommended_strategy: { strategy: result.recommended_strategy?.strategy ?? "MITIGATE" },
      evidence_items: result.audit_evidence_required?.length ?? 0,
      grounded_frameworks: {
        iso_27001_2022: { control_id: gf.iso_27001_2022?.control_id ?? "" },
        soc_2: { criteria: gf.soc_2?.criteria ?? "" },
        gdpr: { article: gf.gdpr?.article ?? "" },
        ccpa_cpra: { section: gf.ccpa_cpra?.section ?? "" },
        hipaa: { rule: gf.hipaa?.rule ?? "" },
        nist_csf_2: { subcategories: gf.nist_csf_2?.subcategories ?? "" },
        aiuc_1: { requirements: gf.aiuc_1?.requirements ?? "" },
        dora: { article: gf.dora?.article ?? "" },
      },
    },
  };
}

/** Fire-and-forget: a failed beacon must never affect the analysis on screen. */
export function sendTrackEvent(url: string, event: TrackEvent): void {
  try {
    const body = JSON.stringify(event);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(
      () => undefined,
    );
  } catch {
    // ignore
  }
}
