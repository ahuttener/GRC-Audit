"use client";

import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import IncidentConsole from "@/components/IncidentConsole";
import ResultView from "@/components/ResultView";
import GrcPrinciples from "@/components/GrcPrinciples";
import type { AuditResponse } from "@/types/grc";

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

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-incident", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ incident, archetype }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setResp(null);
      } else {
        setResp(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-100">
            <ShieldCheck className="h-6 w-6 text-accent" />
            Incident → Framework diagnostic &amp; remediation
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Describe any security incident or audit finding in plain language. GRC Audit maps it to
            NIST CSF 2.0, ISO/IEC 27001:2022, SOC 2, GDPR, CCPA/CPRA and HIPAA — grounded against
            embedded official catalogs so control IDs are verified, not hallucinated — then lists the
            audit evidence an assessor will request and builds a 3-step remediation plan.
          </p>
        </section>

        <GrcPrinciples />

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
      </div>

      <footer className="mt-10 border-t border-line py-6 text-center text-xs text-slate-500">
        GRC Audit · built by{" "}
        <a href="https://cybersecinfo.com" className="text-accent hover:underline">
          CyberSecInfo
        </a>{" "}
        · grounded against embedded NIST, ISO 27001, SOC 2, GDPR, CCPA/CPRA &amp; HIPAA catalogs ·
        automated output is an indicator, not legal advice.
      </footer>
    </main>
  );
}
