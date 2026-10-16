"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Github, ShieldCheck, type LucideIcon } from "lucide-react";

// Same top bar as cybersecinfo.com, so GRC Audit reads as part of the site.
// Absolute URLs keep every link working on both cybersecinfo.com/grcaudit and GitHub Pages.
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

export default function Header() {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  // On a static page the image can fail before React hydrates (onError never fires) — check once.
  useEffect(() => {
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) setLogoFailed(true);
  }, []);
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5">
        <a href={HOME} className="flex shrink-0 items-center" aria-label="CyberSecInfo — home">
          {logoFailed ? (
            <span className="font-display text-lg font-bold tracking-wide text-white">
              Cyber<span className="text-accent">SecInfo</span>
            </span>
          ) : (
            // The live CyberSecInfo wordmark; falls back to text if it can't load.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={logoRef}
              src={`${HOME}img/logo.png`}
              alt="CyberSecInfo — Information Security"
              className="h-10 w-auto"
              onError={() => setLogoFailed(true)}
            />
          )}
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
