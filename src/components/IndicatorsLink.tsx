import { ArrowUpRight, BarChart3 } from "lucide-react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Entry card for the live KPI / KRI dashboard and its public API. */
export default function IndicatorsLink() {
  return (
    <a
      href={`${BASE_PATH}/indicators/`}
      className="group flex items-start gap-4 rounded-2xl border border-accent/30 bg-panel2 p-4 transition-colors hover:border-accent/60 hover:bg-accent/5 sm:items-center sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
        <BarChart3 className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Live indicators · Open API
        </span>
        <span className="mt-0.5 block font-semibold text-white">GRC KPI &amp; KRI Dashboard</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-400">
          Key risk indicators with risk-appetite thresholds, a severity heat map, control coverage across
          all 7 frameworks and a JSON / CSV API ready for Power BI, Grafana or Excel.
        </span>
      </span>
      <ArrowUpRight
        className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition-colors group-hover:text-accent sm:mt-0"
        aria-hidden="true"
      />
    </a>
  );
}
