import type { AuditResponse } from "@/types/grc";

// The latest diagnosis, kept only in this browser tab (sessionStorage) so the indicators page can
// offer the complete PDF — incident report + KRI report. Nothing here is ever sent to the server.
const KEY = "grcaudit:last-audit";

export function saveLastAudit(resp: AuditResponse): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(resp));
  } catch {
    /* storage blocked or full — the separate PDFs still work */
  }
}

/** Shape check before rendering: the stored value may be stale, edited or from an older version. */
export function isAuditResponse(x: unknown): x is AuditResponse {
  const v = x as AuditResponse | null;
  const r = v?.result;
  return Boolean(
    r &&
      typeof r.incident_title === "string" &&
      typeof r.incident_summary === "string" &&
      r.grounded_frameworks?.iso_27001_2022 &&
      r.grounded_frameworks.soc_2 &&
      r.grounded_frameworks.gdpr &&
      r.grounded_frameworks.ccpa_cpra &&
      r.grounded_frameworks.hipaa &&
      r.grounded_frameworks.nist_csf_2 &&
      Array.isArray(r.audit_evidence_required) &&
      r.remediation_plan &&
      Array.isArray(v?.verification?.verified) &&
      Array.isArray(v?.verification?.unverified),
  );
}

export function loadLastAudit(): AuditResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isAuditResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
