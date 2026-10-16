import nist from "@/data/frameworks/nist-csf-2.0.json";
import iso from "@/data/frameworks/iso-27001-2022.json";
import gdpr from "@/data/frameworks/gdpr-official.json";
import hipaa from "@/data/frameworks/hipaa-security-privacy.json";
import soc from "@/data/frameworks/soc-2-tsc.json";
import ccpa from "@/data/frameworks/ccpa-cpra.json";
import aiuc from "@/data/frameworks/aiuc-1.json";

interface Cat {
  framework: string;
  version: string;
  source_url: string;
}

const CATS: Cat[] = [nist, iso, soc, gdpr, ccpa, hipaa, aiuc] as unknown as Cat[];

// Direct official download/text per source, plus whether it is free. Keyed by source_url.
const DOWNLOAD: Record<string, { free: boolean; url: string; label: string }> = {
  "https://doi.org/10.6028/NIST.CSWP.29": {
    free: true,
    url: "https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf",
    label: "Official PDF",
  },
  "https://www.iso.org/standard/27001": {
    free: false,
    url: "https://www.iso.org/standard/27001",
    label: "Purchase (paid)",
  },
  "https://www.aicpa-cima.com/resources/landing/trust-services-criteria": {
    free: true,
    url: "https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022",
    label: "Official PDF",
  },
  "https://eur-lex.europa.eu/eli/reg/2016/679/oj": {
    free: true,
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679",
    label: "Official PDF",
  },
  "https://oag.ca.gov/privacy/ccpa": {
    free: true,
    url: "https://oag.ca.gov/privacy/ccpa",
    label: "Official text",
  },
  "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164": {
    free: true,
    url: "https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164",
    label: "Official text (eCFR)",
  },
  "https://www.aiuc-1.com/": {
    free: true,
    url: "https://standard.aiuc-1.com/",
    label: "Official standard",
  },
};

export default function Sources() {
  return (
    <section className="rounded-2xl border border-line bg-panel2/50 p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-accent">Official sources</h2>
      <p className="mt-1 text-xs text-slate-500">
        Every control ID this tool cites is drawn from, and verified against, the official source for
        each framework. Paid/copyrighted standards (ISO/IEC 27001, SOC 2) are referenced by official
        identifier and short title only — the standards&apos; text is not reproduced.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CATS.map((c) => {
          const dl = DOWNLOAD[c.source_url];
          return (
            <li key={c.framework} className="rounded-xl border border-line bg-panel p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-slate-200">{c.framework}</div>
                {dl ? (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      dl.free
                        ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/30"
                        : "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/30"
                    }`}
                  >
                    {dl.free ? "FREE" : "PAID"}
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-slate-500">{c.version}</div>
              {dl ? (
                <a
                  href={dl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-medium text-accent hover:underline"
                >
                  {dl.label} ↓
                </a>
              ) : (
                <a
                  href={c.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block break-all text-xs text-accent hover:underline"
                >
                  {c.source_url}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
