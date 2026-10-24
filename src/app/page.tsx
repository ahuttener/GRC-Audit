"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import IncidentConsole from "@/components/IncidentConsole";
import ResultView from "@/components/ResultView";
import GrcPrinciples from "@/components/GrcPrinciples";
import RiskTreatmentCard from "@/components/RiskTreatmentCard";
import Sources from "@/components/Sources";
import CompanionProject from "@/components/CompanionProject";
import IndicatorsLink from "@/components/IndicatorsLink";
import Footer from "@/components/Footer";
import type { AuditResponse } from "@/types/grc";
import { analyzeLocally } from "@/lib/analyzer";
import { verify } from "@/lib/grounding";
import { buildTrackEvent, sendTrackEvent } from "@/lib/telemetry";
import { saveLastAudit } from "@/lib/lastAudit";

// Static builds run the grounded demo engine in the browser (no backend needed).
// Set NEXT_PUBLIC_USE_API=1 on a Node/Vercel deploy to use the LLM API route instead.
const USE_API = process.env.NEXT_PUBLIC_USE_API === "1";
// Endpoint for LLM mode. On a PHP host (e.g. Hostinger) set this to the PHP endpoint,
// e.g. NEXT_PUBLIC_API_URL="api/audit-incident.php". Defaults to the Next.js route.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/audit-incident";
// Anonymous indicators for demo analyses (PHP host only; AI analyses are recorded server-side).
const TRACK_URL = process.env.NEXT_PUBLIC_TRACK_URL || "";
// Served under a sub-path on static hosts (/grcaudit, /GRC-Audit); set in next.config.mjs.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const TAGS = ["NIST CSF 2.0", "ISO 27001", "SOC 2", "GDPR", "CCPA/CPRA", "HIPAA", "AIUC-1", "DORA"];

export default function Page() {
  const [incident, setIncident] = useState("");
  const [archetype, setArchetype] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lets the indicators page offer the complete PDF (this incident + the KRI report).
  useEffect(() => {
    if (resp) saveLastAudit(resp);
  }, [resp]);

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
    if (TRACK_URL) {
      sendTrackEvent(TRACK_URL, buildTrackEvent(result, { archetype, inputChars: incident.length, fallback: USE_API }));
    }
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
            NIST CSF 2.0, ISO/IEC 27001:2022, SOC 2, GDPR, CCPA/CPRA, HIPAA, the AIUC-1 AI agent standard and DORA for EU financial entities — grounded against
            embedded official catalogs so control IDs are verified, not hallucinated — then lists the
            audit evidence an assessor will request and builds a 3-step remediation plan.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <IndicatorsLink />
            <CompanionProject />
          </div>
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

      <Footer />
    </main>
  );
}
