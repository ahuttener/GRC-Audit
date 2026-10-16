import { ArrowUpRight, ClipboardCheck } from "lucide-react";

const REPO = "https://github.com/ahuttener/identity-governance-audit-framework";

/** Cross-link to the companion portfolio repo: the same GRC work, done by hand as a full simulated audit. */
export default function CompanionProject() {
  return (
    <a
      href={REPO}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-4 rounded-2xl border border-accent/30 bg-panel2 p-4 transition-colors hover:border-accent/60 hover:bg-accent/5 sm:items-center sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Companion project · GitHub
        </span>
        <span className="mt-0.5 block font-semibold text-white">Identity Governance Audit Framework</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-400">
          A full simulated audit engagement: SOC 2 Type 2 integrated with an ISO/IEC 27001 surveillance
          audit, from risk assessment to control testing workpapers, findings and remediation.
        </span>
      </span>
      <ArrowUpRight
        className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition-colors group-hover:text-accent sm:mt-0"
        aria-hidden="true"
      />
      <span className="sr-only">(opens on GitHub in a new tab)</span>
    </a>
  );
}
