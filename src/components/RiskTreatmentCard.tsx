import { ShieldCheck, Ban, ArrowLeftRight, FileSignature } from "lucide-react";

const PILLARS = [
  {
    key: "MITIGATE",
    icon: ShieldCheck,
    color: "text-emerald-300 ring-emerald-400/30 bg-emerald-500/10",
    def: "Implement controls and security baselines to reduce likelihood and impact.",
  },
  {
    key: "AVOID",
    icon: Ban,
    color: "text-red-300 ring-red-400/30 bg-red-500/10",
    def: "Discontinue the high-risk operational activity entirely.",
  },
  {
    key: "TRANSFER",
    icon: ArrowLeftRight,
    color: "text-sky-300 ring-sky-400/30 bg-sky-500/10",
    def: "Reallocate financial or operational liability (cyber insurance, third-party SLAs).",
  },
  {
    key: "ACCEPT",
    icon: FileSignature,
    color: "text-amber-300 ring-amber-400/30 bg-amber-500/10",
    def: "Formally retain the residual risk with documented executive sign-off within corporate risk appetite.",
  },
];

export default function RiskTreatmentCard() {
  return (
    <section className="rounded-2xl border border-line bg-panel2/50 p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-accent">
        Core Principle: The Pillars of Risk Treatment{" "}
        <span className="normal-case text-slate-500">(ISO 31000 &amp; NIST)</span>
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Every risk has four possible treatments. The audit below recommends one as its primary
        strategy — but the others are always on the table.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.key} className="rounded-xl border border-line bg-panel p-4">
              <div
                className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ${p.color}`}
              >
                <Icon className="h-4 w-4" />
                {p.key}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{p.def}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
