import { Gavel, ScanSearch, Gauge, ShieldCheck, Activity } from "lucide-react";

const PRINCIPLES = [
  { icon: Gavel, name: "Govern", desc: "Policies, roles and accountability frame every finding and decision." },
  { icon: ScanSearch, name: "Identify", desc: "Classify the incident and map it to controls across seven frameworks." },
  { icon: Gauge, name: "Assess", desc: "Rate severity and regulatory exposure; every control ID is grounded." },
  { icon: ShieldCheck, name: "Mitigate", desc: "Contain, investigate & notify, then fix the root cause." },
  { icon: Activity, name: "Monitor", desc: "Evidence and continuous controls to detect and prevent recurrence." },
];

export default function GrcPrinciples() {
  return (
    <section className="rounded-2xl border border-line bg-panel2/50 p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-accent">
        Built on the GRC lifecycle
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Governance, Risk &amp; Compliance isn&apos;t a checklist — it&apos;s a loop. Every audit this
        tool runs moves through the same five principles.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {PRINCIPLES.map((p, i) => {
          const Icon = p.icon;
          return (
            <div key={p.name} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/30">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-slate-100">
                  <span className="text-slate-500">{i + 1}.</span> {p.name}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
