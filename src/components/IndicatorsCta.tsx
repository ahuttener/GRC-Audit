import { ArrowRight, BarChart3, CheckCircle2 } from "lucide-react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
// Analyses are recorded only on the PHP deployment (see page.tsx / api/track.php).
const TRACKED = Boolean(process.env.NEXT_PUBLIC_TRACK_URL);

/** After every diagnosis: tell the user where this incident now shows up, with a real button. */
export default function IndicatorsCta() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/50 bg-accent/10 p-4 shadow-[0_0_32px_-12px_rgba(6,182,212,0.6)] sm:flex-row sm:items-center sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        {TRACKED ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <BarChart3 className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">
          {TRACKED
            ? "Diagnosis complete — this incident now counts in the GRC Indicators."
            : "Diagnosis complete — see how incidents add up in the GRC Indicators."}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-300">
          See how it moves the Key Risk Indicators, the risk heat map and the most-failed controls, and download the KRI
          report (PDF).
        </p>
      </div>
      <a
        href={`${BASE_PATH}/indicators/`}
        className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent-strong px-5 py-2.5 text-sm font-bold uppercase tracking-[0.05em] text-gray-900 transition-colors hover:bg-accent"
      >
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
        View in GRC Indicators
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </a>
    </div>
  );
}
