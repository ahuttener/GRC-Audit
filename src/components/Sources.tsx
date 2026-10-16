import nist from "@/data/frameworks/nist-csf-2.0.json";
import iso from "@/data/frameworks/iso-27001-2022.json";
import gdpr from "@/data/frameworks/gdpr-official.json";
import hipaa from "@/data/frameworks/hipaa-security-privacy.json";
import soc from "@/data/frameworks/soc-2-tsc.json";
import ccpa from "@/data/frameworks/ccpa-cpra.json";

interface Cat {
  framework: string;
  version: string;
  source_url: string;
}

const CATS: Cat[] = [nist, iso, soc, gdpr, ccpa, hipaa] as unknown as Cat[];

export default function Sources() {
  return (
    <section className="rounded-2xl border border-line bg-panel2/50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Official sources</h2>
      <p className="mt-1 text-xs text-slate-500">
        Every control ID this tool cites is drawn from, and verified against, the official source
        for each framework. Paid/copyrighted standards (ISO/IEC 27001, SOC 2) are referenced by their
        official identifier and short title only — the standards&apos; text is not reproduced.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CATS.map((c) => (
          <li key={c.framework} className="rounded-xl border border-line bg-panel p-3">
            <div className="text-xs font-semibold text-slate-200">{c.framework}</div>
            <div className="text-[11px] text-slate-500">{c.version}</div>
            <a
              href={c.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-xs text-accent hover:underline"
            >
              {c.source_url}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
