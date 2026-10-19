"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import IncidentConsole from "@/components/IncidentConsole";
import ResultView from "@/components/ResultView";
import GrcPrinciples from "@/components/GrcPrinciples";
import RiskTreatmentCard from "@/components/RiskTreatmentCard";
import Sources from "@/components/Sources";
import CompanionProject from "@/components/CompanionProject";
import type { AuditResponse } from "@/types/grc";
import { analyzeLocally } from "@/lib/analyzer";
import { verify } from "@/lib/grounding";

// Static builds run the grounded demo engine in the browser (no backend needed).
// Set NEXT_PUBLIC_USE_API=1 on a Node/Vercel deploy to use the LLM API route instead.
const USE_API = process.env.NEXT_PUBLIC_USE_API === "1";
// Endpoint for LLM mode. On a PHP host (e.g. Hostinger) set this to the PHP endpoint,
// e.g. NEXT_PUBLIC_API_URL="api/audit-incident.php". Defaults to the Next.js route.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/audit-incident";
// Served under a sub-path on static hosts (/grcaudit, /GRC-Audit); set in next.config.mjs.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TAGS = ["NIST CSF 2.0", "ISO 27001", "SOC 2", "GDPR", "CCPA/CPRA", "HIPAA", "AIUC-1"];

export default function Page() {
  const [incident, setIncident] = useState("");
  const [archetype, setArchetype] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = (text: string, arch: string) => {
    setIncident(text);
    setArchetype(arch);
    setError(null);
  };
  const onChange = (v: string) => {
    setIncident(v);
    setArchetype(undefined); // manual edits drop the scenario hint
  };

  const runDemo = () => {
    // Client-side grounded demo engine — runs on static hosting, no key, no cost.
    const result = analyzeLocally(incident, archetype);
    setResp({ source: "demo", verification: verify(result), result });
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_API) {
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ incident, archetype }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.result) {
            // The PHP endpoint returns { source, model, result }; verify client-side.
            const verification = data.verification ?? verify(data.result);
            setResp({ source: data.source ?? "llm", model: data.model, verification, result: data.result });
            return;
          }
          if (res.status === 400 && data?.error) {
            // Input problem (too short / too long): tell the user instead of guessing.
            setError(data.error);
            setResp(null);
            return;
          }
          // AI not configured, rate-limited or temporarily down → use the demo engine.
        } catch {
          // Network error → use the demo engine.
        }
      }
      runDemo();
    } catch {
      setError("Something went wrong analyzing the incident. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_0_48px_-16px_rgba(6,182,212,0.45)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${BASE_PATH}/banner.jpg`}
              width={1600}
              height={640}
              alt="GRC — Governance, Risk and Compliance: policies, risk management and compliance across ISO 27001, NIST, SOC 2, HIPAA and GDPR"
              className="block h-auto w-full"
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${BASE_PATH}/emblem.png`}
                width={256}
                height={256}
                alt="CyberSecInfo — Information Security"
                className="h-14 w-14 shrink-0 rounded-full shadow-[0_0_24px_rgba(6,182,212,0.45)] sm:h-16 sm:w-16"
              />
              <div>
                <h1 className="text-glow font-display text-3xl font-black uppercase tracking-[0.05em] text-accent sm:text-4xl">
                  GRC Audit
                </h1>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-sm">
                  Incident → Framework diagnostic &amp; remediation
                </p>
              </div>
            </div>
            <ul className="flex flex-wrap gap-2" aria-label="Frameworks covered">
              {TAGS.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-accent/25 bg-accent/5 px-3 py-1 text-xs font-medium text-slate-200"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
            Describe any security incident or audit finding in plain language. GRC Audit maps it to
            NIST CSF 2.0, ISO/IEC 27001:2022, SOC 2, GDPR, CCPA/CPRA, HIPAA and the AIUC-1 AI agent standard — grounded against
            embedded official catalogs so control IDs are verified, not hallucinated — then lists the
            audit evidence an assessor will request and builds a 3-step remediation plan.
          </p>
          <CompanionProject />
        </section>

        <GrcPrinciples />

        <RiskTreatmentCard />

        <IncidentConsole
          value={incident}
          onChange={onChange}
          onPick={pick}
          onSubmit={submit}
          loading={loading}
        />

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {resp && <ResultView resp={resp} />}

        {!resp && !error && (
          <p className="pt-2 text-center text-xs text-slate-600">
            Tip: click a scenario pill above, then “Audit Incident”. Works with zero setup in demo
            mode; add an API key for full LLM analysis of any incident.
          </p>
        )}

        <Sources />
      </div>

      <footer className="mt-10 border-t border-line py-6 text-center text-xs text-slate-500">
        GRC Audit · built by{" "}
        <a href="https://cybersecinfo.com" className="text-accent hover:underline">
          CyberSecInfo
        </a>{" "}
        · grounded against embedded NIST, ISO 27001, SOC 2, GDPR, CCPA/CPRA, HIPAA &amp; AIUC-1 catalogs ·
        automated output is an indicator, not legal advice.
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          <a href="https://www.instagram.com/cyber_secinfo/" target="_blank" rel="noopener noreferrer" aria-label="CyberSecInfo on Instagram" className="inline-flex items-center gap-2 text-slate-300 hover:text-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJnIiBjeD0iMzAlIiBjeT0iMTA3JSIgcj0iMTUwJSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRmNDk3Ii8+PHN0b3Agb2Zmc2V0PSIuMDUiIHN0b3AtY29sb3I9IiNmZGY0OTciLz48c3RvcCBvZmZzZXQ9Ii40NSIgc3RvcC1jb2xvcj0iI2ZkNTk0OSIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiNkNjI0OWYiLz48c3RvcCBvZmZzZXQ9Ii45IiBzdG9wLWNvbG9yPSIjMjg1QUVCIi8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNiIgZmlsbD0idXJsKCNnKSIvPjxyZWN0IHg9IjUiIHk9IjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgcng9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48Y2lyY2xlIGN4PSIxNi4zIiBjeT0iNy43IiByPSIxLjA1IiBmaWxsPSIjZmZmIi8+PC9zdmc+" width={20} height={20} alt="" aria-hidden="true" />
            @cyber_secinfo
          </a>
          <a href="https://github.com/ahuttener" target="_blank" rel="noopener noreferrer" aria-label="Adriano Huttener on GitHub" className="inline-flex items-center gap-2 text-slate-300 hover:text-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2YyZjVmYyIgZD0iTTEyIC4yOTdjLTYuNjMgMC0xMiA1LjM3My0xMiAxMiAwIDUuMzAzIDMuNDM4IDkuOCA4LjIwNSAxMS4zODUuNi4xMTMuODItLjI1OC44Mi0uNTc3IDAtLjI4NS0uMDEtMS4wNC0uMDE1LTIuMDQtMy4zMzguNzI0LTQuMDQyLTEuNjEtNC4wNDItMS42MUM0LjQyMiAxOC4wNyAzLjYzMyAxNy43IDMuNjMzIDE3LjdjLTEuMDg3LS43NDQuMDg0LS43MjkuMDg0LS43MjkgMS4yMDUuMDg0IDEuODM4IDEuMjM2IDEuODM4IDEuMjM2IDEuMDcgMS44MzUgMi44MDkgMS4zMDUgMy40OTUuOTk4LjEwOC0uNzc2LjQxNy0xLjMwNS43Ni0xLjYwNS0yLjY2NS0uMy01LjQ2Ni0xLjMzMi01LjQ2Ni01LjkzIDAtMS4zMS40NjUtMi4zOCAxLjIzNS0zLjIyLS4xMzUtLjMwMy0uNTQtMS41MjMuMTA1LTMuMTc2IDAgMCAxLjAwNS0uMzIyIDMuMyAxLjIzLjk2LS4yNjcgMS45OC0uMzk5IDMtLjQwNSAxLjAyLjAwNiAyLjA0LjEzOCAzIC40MDUgMi4yOC0xLjU1MiAzLjI4NS0xLjIzIDMuMjg1LTEuMjMuNjQ1IDEuNjUzLjI0IDIuODczLjEyIDMuMTc2Ljc2NS44NCAxLjIzIDEuOTEgMS4yMyAzLjIyIDAgNC42MS0yLjgwNSA1LjYyNS01LjQ3NSA1LjkyLjQyLjM2LjgxIDEuMDk2LjgxIDIuMjIgMCAxLjYwNi0uMDE1IDIuODk2LS4wMTUgMy4yODYgMCAuMzE1LjIxLjY5LjgyNS41N0MyMC41NjUgMjIuMDkyIDI0IDE3LjU5MiAyNCAxMi4yOTdjMC02LjYyNy01LjM3My0xMi0xMi0xMiIvPjwvc3ZnPg==" width={20} height={20} alt="" aria-hidden="true" />
            ahuttener
          </a>
        </div>
        <p className="mt-3">&copy; 2026 CyberSecInfo. All rights reserved.</p>
      </footer>
    </main>
  );
}
