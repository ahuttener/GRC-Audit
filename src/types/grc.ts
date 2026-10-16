// Response schema for the grounded GRC audit. Field names match the task spec.

export type SeverityLevel = "Low" | "Medium" | "High" | "Critical";

export type FailureCategory =
  | "Identity & Access Management"
  | "Data Leakage"
  | "Cloud Misconfiguration"
  | "Third-Party Risk"
  | "Endpoint Security";

export interface IsoMapping {
  control_id: string;
  control_name: string;
  category: string;
  audit_finding: string;
}
export interface SocMapping {
  criteria: string;
  name: string;
  audit_finding: string;
}
export interface GdprMapping {
  article: string;
  name: string;
  regulatory_risk: string;
}
export interface CcpaMapping {
  section: string;
  name: string;
  regulatory_risk: string;
}
export interface HipaaMapping {
  rule: string;
  name: string;
  regulatory_risk: string;
}
export interface NistMapping {
  subcategories: string;
  function_name: string;
}

export interface GroundedFrameworks {
  iso_27001_2022: IsoMapping;
  soc_2: SocMapping;
  gdpr: GdprMapping;
  ccpa_cpra: CcpaMapping;
  hipaa: HipaaMapping;
  nist_csf_2: NistMapping;
}

export interface RemediationPlan {
  step_1_containment: string;
  step_2_leak_and_legal: string;
  step_3_permanent_fix: string;
}

export interface AuditResult {
  incident_title: string;
  incident_summary: string;
  severity_level: SeverityLevel;
  failure_category: FailureCategory;
  grounded_frameworks: GroundedFrameworks;
  audit_evidence_required: string[];
  remediation_plan: RemediationPlan;
}

/** Result of validating cited control IDs against the local framework catalogs. */
export interface Verification {
  cited: string[];
  verified: string[];
  unverified: string[];
  /** true when every cited ID was found in a catalog (no hallucinated IDs). */
  grounded: boolean;
}

export interface AuditResponse {
  source: "llm" | "demo";
  model?: string;
  verification: Verification;
  result: AuditResult;
}
