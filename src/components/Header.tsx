"use client";

import type { MouseEvent } from "react";
import { ArrowLeft, FileText, Github, ShieldCheck, type LucideIcon } from "lucide-react";

// Same top bar as cybersecinfo.com, so GRC Audit reads as part of the site — with a Back
// button where the logo would be. Absolute URLs keep every link working on both
// cybersecinfo.com/grcaudit and the GitHub Pages mirror.
const HOME = "https://cybersecinfo.com/";
const NAV: { label: string; href: string; icon?: LucideIcon; active?: boolean }[] = [
  { label: "GitHub", href: "https://github.com/ahuttener", icon: Github },
  { label: "GRC Audit", href: `${HOME}grcaudit/`, icon: ShieldCheck, active: true },
  { label: "Editor PDF", href: `${HOME}editor-pdf/`, icon: FileText },
  { label: "Topics", href: `${HOME}#threats` },
  { label: "Protection", href: `${HOME}#protection` },
  { label: "AI Analyzer", href: `${HOME}#analyzer` },
  { label: "AI Chat", href: `${HOME}#chatbot` },
  { label: "Quiz", href: `${HOME}#quiz` },
];

/** Came from another cybersecinfo.com page (e.g. the portfolio)? Then go back to exactly that page. */
function goBack(e: MouseEvent<HTMLAnchorElement>) {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.hostname.endsWith("cybersecinfo.com") && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  } catch {
    // fall through to the plain link (home page)
  }
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5">
        <a
          href={HOME}
          onClick={goBack}
          aria-label="Back to CyberSecInfo"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-accent/40 bg-accent/5 px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.05em] text-accent transition-colors hover:bg-accent-strong hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </a>
        <nav aria-label="CyberSecInfo" className="no-scrollbar -mx-2 w-full overflow-x-auto lg:mx-0 lg:w-auto">
          <ul className="flex items-center gap-0.5 whitespace-nowrap">
            {NAV.map(({ label, href, icon: Icon, active }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-[13px] font-medium uppercase tracking-[0.05em] transition-colors hover:text-accent ${
                    active ? "text-accent" : "text-white"
                  }`}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
