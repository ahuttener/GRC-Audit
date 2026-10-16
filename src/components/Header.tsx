"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

const TAGS = ["NIST CSF 2.0", "ISO 27001", "SOC 2", "GDPR", "CCPA/CPRA", "HIPAA"];

export default function Header() {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <header className="border-b border-line bg-panel2/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-accent/10 ring-1 ring-accent/30">
            {logoFailed ? (
              <ShieldCheck className="h-6 w-6 text-accent" />
            ) : (
              // Loads the live CyberSecInfo logo; falls back to a shield if offline.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="https://cybersecinfo.com/img/logo.png"
                alt="CyberSecInfo"
                className="h-9 w-9 object-contain"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight">
              GRC <span className="text-accent">Audit</span>
            </div>
            <div className="text-xs text-slate-400">by CyberSecInfo</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-slate-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
