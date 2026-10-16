import type { GroundedFrameworks } from "@/types/grc";

interface Card {
  label: string;
  jurisdiction: string;
  accent: string;
  id: string;
  name: string;
  body: string;
  sub?: string;
}

function build(gf: GroundedFrameworks): Card[] {
  return [
    {
      label: "NIST CSF 2.0", jurisdiction: "US", accent: "text-sky-300 border-sky-400/30",
      id: gf.nist_csf_2.subcategories, name: gf.nist_csf_2.function_name, body: "",
    },
    {
      label: "ISO/IEC 27001:2022", jurisdiction: "International", accent: "text-cyan-300 border-cyan-400/30",
      id: gf.iso_27001_2022.control_id, name: gf.iso_27001_2022.control_name,
      body: gf.iso_27001_2022.audit_finding, sub: gf.iso_27001_2022.category,
    },
    {
      label: "SOC 2 (TSC)", jurisdiction: "US", accent: "text-violet-300 border-violet-400/30",
      id: gf.soc_2.criteria, name: gf.soc_2.name, body: gf.soc_2.audit_finding,
    },
    {
      label: "GDPR", jurisdiction: "EU", accent: "text-blue-300 border-blue-400/30",
      id: gf.gdpr.article, name: gf.gdpr.name, body: gf.gdpr.regulatory_risk,
    },
    {
      label: "CCPA / CPRA", jurisdiction: "US – California", accent: "text-amber-300 border-amber-400/30",
      id: gf.ccpa_cpra.section, name: gf.ccpa_cpra.name, body: gf.ccpa_cpra.regulatory_risk,
    },
    {
      label: "HIPAA", jurisdiction: "US – Health", accent: "text-rose-300 border-rose-400/30",
      id: gf.hipaa.rule, name: gf.hipaa.name, body: gf.hipaa.regulatory_risk,
    },
    {
      label: "AIUC-1", jurisdiction: "AI agents", accent: "text-emerald-300 border-emerald-400/30",
      id: gf.aiuc_1?.requirements ?? "N/A",
      name: gf.aiuc_1?.name ?? "AI agent standard",
      body: gf.aiuc_1?.audit_finding ?? "Not applicable — no AI system or agent is involved.",
    },
  ];
}

export default function FrameworkMatrix({ gf }: { gf: GroundedFrameworks }) {
  const cards = build(gf);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border bg-panel p-4 ${c.accent}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{c.label}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{c.jurisdiction}</span>
          </div>
          <div className="mt-2 font-mono text-sm font-bold text-slate-100">{c.id}</div>
          <div className="text-xs text-slate-300">{c.name}</div>
          {c.sub ? <div className="mt-1 text-[11px] text-slate-500">{c.sub}</div> : null}
          {c.body ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{c.body}</p> : null}
        </div>
      ))}
    </div>
  );
}
