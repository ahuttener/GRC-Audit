import type { AuditResponse } from "@/types/grc";
import SeverityPill from "./SeverityPill";
import FrameworkMatrix from "./FrameworkMatrix";
import EvidenceCard from "./EvidenceCard";
import RemediationRoadmap from "./RemediationRoadmap";
import ExportActions from "./ExportActions";
import { Sparkles, Cpu, BadgeCheck, AlertTriangle, Target } from "lucide-react";

const STRAT: Record<string, string> = {
  MITIGATE: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30",
  AVOID: "bg-red-500/10 text-red-300 ring-1 ring-red-400/30",
  TRANSFER: "bg-sky-500/10 text-sky-300 ring-1 ring-sky-400/30",
  ACCEPT: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/30",
};

export default function ResultView({ resp }: { resp: AuditResponse }) {
  const r = resp.result;
  const v = resp.verification;
  return (
    <div className="space-y-6">
      {/* Top banner */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-panel to-panel2 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <SeverityPill level={r.severity_level} />
          <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-300">
            {r.failure_category}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
            {resp.source === "llm" ? (
              <>
                <Cpu className="h-3.5 w-3.5" /> {resp.model}
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Demo engine
              </>
            )}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-bold text-slate-100">{r.incident_title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{r.incident_summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
              STRAT[r.recommended_strategy?.strategy ?? "MITIGATE"] ?? STRAT.MITIGATE
            }`}
          >
            <Target className="h-4 w-4" />
            Recommended Strategy: {r.recommended_strategy?.strategy ?? "MITIGATE"}
          </span>
          {r.recommended_strategy?.rationale ? (
            <span className="text-xs text-slate-400">{r.recommended_strategy.rationale}</span>
          ) : null}
        </div>
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
            v.grounded
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30"
              : "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/30"
          }`}
        >
          {v.grounded ? (
            <>
              <BadgeCheck className="h-4 w-4" />
              Grounded — {v.verified.length} control IDs verified against local official catalogs
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              {v.unverified.length} cited ID(s) could not be verified against the catalogs
            </>
          )}
        </div>
      </div>

      {/* Framework matrix */}
      <section>
        <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-[0.12em] text-accent">
          Identify &amp; Assess · Grounded framework matrix
        </h3>
        <FrameworkMatrix gf={r.grounded_frameworks} />
      </section>

      {/* Evidence + remediation */}
      <div className="grid gap-5 lg:grid-cols-2">
        <EvidenceCard items={r.audit_evidence_required} />
        <RemediationRoadmap plan={r.remediation_plan} />
      </div>

      <ExportActions resp={resp} />
    </div>
  );
}
