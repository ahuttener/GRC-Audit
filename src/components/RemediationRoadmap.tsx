import type { RemediationPlan } from "@/types/grc";
import { ShieldAlert, Scale, Wrench } from "lucide-react";

export default function RemediationRoadmap({ plan }: { plan: RemediationPlan }) {
  const steps = [
    { n: 1, icon: ShieldAlert, title: "Immediate containment", body: plan.step_1_containment, accent: "text-red-300 bg-red-500/10 ring-red-400/30" },
    { n: 2, icon: Scale, title: "Data-leak investigation & legal", body: plan.step_2_leak_and_legal, accent: "text-amber-300 bg-amber-500/10 ring-amber-400/30" },
    { n: 3, icon: Wrench, title: "Permanent systemic fix", body: plan.step_3_permanent_fix, accent: "text-emerald-300 bg-emerald-500/10 ring-emerald-400/30" },
  ];
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">Mitigate · 3-step remediation roadmap</h3>
      <ol className="space-y-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.n} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-2 ${s.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {i < steps.length - 1 && <div className="mt-1 w-px flex-1 bg-line" />}
              </div>
              <div className="pb-2">
                <div className="text-sm font-semibold text-slate-100">
                  <span className="mr-2 text-slate-500">Step {s.n}</span>
                  {s.title}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
