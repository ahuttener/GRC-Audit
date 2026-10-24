// Local grounding engine (lightweight RAG). Loads the official framework catalogs,
// retrieves the most relevant controls to inject into the LLM prompt, and verifies
// that every control ID the model cites actually exists in a catalog.

import iso from "@/data/frameworks/iso-27001-2022.json";
import nist from "@/data/frameworks/nist-csf-2.0.json";
import gdpr from "@/data/frameworks/gdpr-official.json";
import hipaa from "@/data/frameworks/hipaa-security-privacy.json";
import soc from "@/data/frameworks/soc-2-tsc.json";
import ccpa from "@/data/frameworks/ccpa-cpra.json";
import aiuc from "@/data/frameworks/aiuc-1.json";
import dora from "@/data/frameworks/dora.json";
import type { AuditResult } from "@/types/grc";

interface Entry {
  id: string;
  name: string;
}

// Normalize each catalog into a flat {id, name} list plus a human label.
const CATALOGS: { key: string; label: string; entries: Entry[] }[] = [
  {
    key: "nist_csf_2",
    label: "NIST CSF 2.0",
    entries: (nist.controls as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "iso_27001_2022",
    label: "ISO/IEC 27001:2022",
    entries: (iso.controls as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "soc_2",
    label: "SOC 2 (TSC)",
    entries: (soc.criteria as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "gdpr",
    label: "GDPR",
    entries: (gdpr.articles as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "ccpa_cpra",
    label: "CCPA/CPRA",
    entries: (ccpa.sections as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "hipaa",
    label: "HIPAA",
    entries: (hipaa.controls as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "aiuc_1",
    label: "AIUC-1 (AI agents)",
    entries: (aiuc.requirements as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
  {
    key: "dora",
    label: "DORA (EU financial sector)",
    entries: (dora.articles as any[]).map((c) => ({ id: c.id, name: c.name })),
  },
];

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "was", "were", "has", "had",
  "a", "an", "of", "to", "in", "on", "is", "are", "by", "it", "as", "at", "or",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Build a compact, relevant catalog block to inject into the LLM prompt. */
export function retrieveContext(incident: string, perFramework = 8): string {
  const want = new Set(tokens(incident));
  const blocks: string[] = [];
  for (const cat of CATALOGS) {
    const scored = cat.entries
      .map((e) => {
        const words = tokens(e.name);
        const score = words.reduce((s, w) => (want.has(w) ? s + 1 : s), 0);
        return { e, score };
      })
      .sort((a, b) => b.score - a.score);
    // Take the best matches; if nothing matched, fall back to the first few anchors.
    const top = scored.filter((s) => s.score > 0).slice(0, perFramework);
    const chosen = (top.length ? top : scored.slice(0, 4)).map((s) => s.e);
    const lines = chosen.map((e) => `  ${e.id} — ${e.name}`).join("\n");
    blocks.push(`${cat.label}:\n${lines}`);
  }
  return blocks.join("\n\n");
}

// ---- Verification: do the cited IDs exist in the catalogs? ----

function validIds(key: string): string[] {
  const cat = CATALOGS.find((c) => c.key === key);
  return cat ? cat.entries.map((e) => e.id) : [];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Catalog IDs written as a range, e.g. GDPR "Art. 15-22" → { prefix: "art. ", from: 15, to: 22 }. */
function parseRange(id: string): { prefix: string; from: number; to: number } | null {
  const m = /^(.*?)(\d+)\s*[-–]\s*(\d+)$/.exec(id);
  return m ? { prefix: m[1], from: Number(m[2]), to: Number(m[3]) } : null;
}

/**
 * Strict-but-practical match of ONE normalised citation against ONE normalised catalog ID.
 *   exact                     "art. 32"        ≡ "art. 32"
 *   finer sub-reference       "art. 5(1)(f)"   → "art. 5"                (next char "(" or space)
 *   parent in a hierarchy     "164.308(a)(1)"  → "164.308(a)(1)(ii)(a)"  (next char "(" or "-",
 *                             "pr.aa"          → "pr.aa-01"               e.g. a CSF category)
 *   inside a catalog range    "art. 17"        → "art. 15-22"
 * A bare digit/dot continuation never matches, so "art. 3" ≠ "art. 32", "art. 50" ≠ "art. 5",
 * "a.5.1" ≠ "a.5.18" and "1798.81" ≠ "1798.81.5" — the false positives an old prefix match allowed.
 */
function idMatches(c: string, v: string): boolean {
  if (c === v) return true;
  if (c.startsWith(v) && /^[\s(]/.test(c.slice(v.length))) return true;
  if (v.startsWith(c) && /^[(-]/.test(v.slice(c.length))) return true;
  const r = parseRange(v);
  if (r && c.startsWith(r.prefix)) {
    const m = /^(\d+)(?=$|[\s(])/.exec(c.slice(r.prefix.length));
    if (m) {
      const n = Number(m[1]);
      if (n >= r.from && n <= r.to) return true;
    }
  }
  return false;
}

/** Is one cited control/article ID present in the given framework's official catalog? */
export function isCitationGrounded(cited: string, key: string): boolean {
  const c = norm(cited);
  if (!c || c === "n/a" || c.includes("not applicable")) return true; // not a citation
  return validIds(key).some((id) => idMatches(c, norm(id)));
}

function splitIds(raw: string): string[] {
  const r = raw.trim();
  // A whole field of "N/A" / "not applicable" is not a citation.
  if (!r || r.toLowerCase() === "n/a" || r.toLowerCase().includes("not applicable")) {
    return [];
  }
  return r
    .split(/[,;&]| and /i) // do NOT split on "/", so "N/A" stays intact
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Verify every cited ID in the result against the catalogs. */
export function verify(result: AuditResult): {
  cited: string[];
  verified: string[];
  unverified: string[];
  grounded: boolean;
} {
  const gf = result.grounded_frameworks;
  const checks: { key: string; raw: string }[] = [
    { key: "iso_27001_2022", raw: gf.iso_27001_2022?.control_id ?? "" },
    { key: "soc_2", raw: gf.soc_2?.criteria ?? "" },
    { key: "gdpr", raw: gf.gdpr?.article ?? "" },
    { key: "ccpa_cpra", raw: gf.ccpa_cpra?.section ?? "" },
    { key: "hipaa", raw: gf.hipaa?.rule ?? "" },
    { key: "nist_csf_2", raw: gf.nist_csf_2?.subcategories ?? "" },
    { key: "aiuc_1", raw: gf.aiuc_1?.requirements ?? "" },
    { key: "dora", raw: gf.dora?.article ?? "" },
  ];

  const cited: string[] = [];
  const verified: string[] = [];
  const unverified: string[] = [];

  for (const { key, raw } of checks) {
    for (const id of splitIds(raw)) {
      const n = norm(id);
      if (!n || n === "n/a" || n.includes("not applicable")) continue;
      cited.push(id);
      if (isCitationGrounded(id, key)) verified.push(id);
      else unverified.push(id);
    }
  }
  return { cited, verified, unverified, grounded: unverified.length === 0 };
}

export const CATALOG_STATS = {
  frameworks: CATALOGS.length,
  controls: CATALOGS.reduce((n, c) => n + c.entries.length, 0),
};
