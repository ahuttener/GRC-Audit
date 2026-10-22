// Response of the GRC Indicators API (php/indicators.php). Ratios are 0–1, null when there is no data.

export interface Ranked {
  key: string;
  count: number;
  share: number | null;
}

export type KriStatus = "green" | "amber" | "red" | "no_data";

export interface Kri {
  id: string;
  name: string;
  description: string;
  value: number | null;
  unit: "ratio" | "ms";
  better: "higher" | "lower";
  appetite: number;
  tolerance: number;
  status: KriStatus;
}

export interface FrameworkIndicators {
  key: string;
  label: string;
  catalog_size: number;
  applicable_analyses: number;
  applicability_rate: number | null;
  citations: number;
  unverified_citations: number;
  avg_citations_when_applicable: number | null;
  distinct_controls_cited: number;
  catalog_coverage: number | null;
  never_cited: number;
  top_controls: { id: string; name: string; count: number; share_of_applicable: number | null }[];
}

export interface DailyPoint {
  day: string;
  total: number;
  ai: number;
  demo: number;
  high_critical: number;
  ai_rate_limited: number;
}

export interface Indicators {
  api: string;
  version: number;
  dataset?: "live" | "examples";
  generated_at: string;
  window: { days: number | "all"; from: string | null; to: string };
  privacy: string;
  kpis: {
    analyses: number;
    ai_analyses: number;
    demo_analyses: number;
    ai_share: number | null;
    custom_incident_share: number | null;
    high_critical_rate: number | null;
    grounded_rate: number | null;
    unverified_citation_rate: number | null;
    avg_controls_per_analysis: number | null;
    catalog_coverage: number | null;
    breach_notification_rate: number | null;
    ai_system_involvement_rate: number | null;
    avg_evidence_items: number | null;
    active_days: number;
    avg_analyses_per_active_day: number | null;
  };
  daily: DailyPoint[];
  risk: {
    severity: Ranked[];
    failure_category: Ranked[];
    risk_strategy: Ranked[];
    severity_by_category: Record<string, Partial<Record<string, number>>>;
  };
  frameworks: FrameworkIndicators[];
  control_families: { iso_themes: Ranked[]; nist_functions: Ranked[]; soc2_series: Ranked[] };
  scenarios: { scenario_runs: number; custom_incidents: number; distinct_scenarios: number; top: Ranked[] };
  operations: {
    ai_attempts: number;
    ai_success_rate: number | null;
    demo_fallbacks: number;
    ai_not_completed: Record<string, number>;
    latency_ms: { p50: number | null; p95: number | null; avg: number | null };
    avg_input_chars: number | null;
  };
  kri: Kri[];
}
