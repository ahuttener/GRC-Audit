import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IndicatorsDashboard from "@/components/indicators/IndicatorsDashboard";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const DESCRIPTION =
  "Live GRC KPIs and Key Risk Indicators from every GRC Audit analysis: risk-appetite thresholds, severity heat map, control coverage across NIST CSF 2.0, ISO 27001, SOC 2, GDPR, CCPA/CPRA, HIPAA, AIUC-1 and DORA, plus an open JSON / CSV API.";

export const metadata: Metadata = {
  title: "GRC Indicators | CyberSecInfo",
  description: DESCRIPTION,
  openGraph: {
    title: "GRC Indicators — KPI & KRI dashboard | CyberSecInfo",
    description: DESCRIPTION,
    url: "https://cybersecinfo.com/grcaudit/indicators/",
    siteName: "CyberSecInfo",
    type: "website",
    images: [{ url: "https://cybersecinfo.com/grcaudit/banner.jpg", width: 1600, height: 640, alt: "GRC — Governance, Risk and Compliance" }],
  },
};

export default function IndicatorsPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
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
              <h1 className="text-glow font-display text-2xl font-black uppercase tracking-[0.05em] text-accent sm:text-4xl">
                GRC Indicators
              </h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-sm">
                KPI &amp; KRI dashboard · open API
              </p>
            </div>
          </div>
          <a
            href={`${BASE_PATH}/`}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/5 px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.05em] text-accent transition-colors hover:bg-accent-strong hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            GRC Audit
          </a>
        </section>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
          Every incident audited in GRC Audit feeds these indicators: Key Risk Indicators measured against a risk
          appetite and tolerance, where the exposure concentrates by category and severity, which official controls
          fail most often and how much of each framework&apos;s catalog has been exercised. The same data is served by
          a read-only API for Power BI, Grafana, Excel or any script.
        </p>
        <IndicatorsDashboard />
      </div>
      <Footer />
    </main>
  );
}
