import { describe, expect, it } from "vitest";
import { isCitationGrounded, verify } from "@/lib/grounding";
import { analyzeLocally } from "@/lib/analyzer";
import { SCENARIOS } from "@/data/scenarios";
import soc2 from "@/data/frameworks/soc-2-tsc.json";
import nist from "@/data/frameworks/nist-csf-2.0.json";
import gdpr from "@/data/frameworks/gdpr-official.json";
import hipaa from "@/data/frameworks/hipaa-security-privacy.json";

describe("isCitationGrounded — real control/article IDs are accepted", () => {
  it.each([
    ["gdpr", "Art. 32"],
    ["gdpr", "Art. 5(1)(f)"], // finer sub-reference of Art. 5
    ["gdpr", "Art. 17"], // inside the catalog range Art. 15-22
    ["gdpr", "Art. 15"],
    ["iso_27001_2022", "A.5.18"],
    ["iso_27001_2022", "A.8.24"],
    ["nist_csf_2", "PR.AA-01"],
    ["nist_csf_2", "PR.AA"], // CSF 2.0 category, parent of PR.AA-01
    ["hipaa", "164.308(a)(3)(ii)(C)"],
    ["hipaa", "164.308(a)(1)"], // parent paragraph of 164.308(a)(1)(ii)(A)
    ["soc_2", "CC6.1"],
    ["soc_2", "CC6.4"], // physical access
    ["soc_2", "CC6.5"],
    ["soc_2", "CC9.1"],
    ["soc_2", "A1.3"],
    ["soc_2", "PI1.2"],
    ["soc_2", "P6.6"],
    ["ccpa_cpra", "1798.100(e)"],
    ["ccpa_cpra", "1798.81.5"],
  ])("%s %s", (key, id) => {
    expect(isCitationGrounded(id, key)).toBe(true);
  });
});

describe("isCitationGrounded — look-alike IDs are rejected (regression for the prefix bug)", () => {
  it.each([
    ["gdpr", "Art. 320"], // the GDPR has 99 articles; must not pass because it starts with "Art. 32"
    ["gdpr", "Art. 500"], // must not pass because it starts with "Art. 50" / "Art. 5"
    ["gdpr", "Art. 990"], // must not pass because it starts with "Art. 99" / "Art. 9"
    ["gdpr", "Art. 150"], // must not pass via "Art. 15" or the "Art. 15-22" range
    ["gdpr", "Art. 150"],
    ["iso_27001_2022", "A.5.99"],
    ["iso_27001_2022", "A.5.1.8"],
    ["iso_27001_2022", "A"],
    ["nist_csf_2", "PR.AA-99"],
    ["nist_csf_2", "PR.AA-1"],
    ["soc_2", "CC6.10"],
    ["soc_2", "CC6"],
    ["hipaa", "164.3"],
    ["hipaa", "164.999"],
    ["ccpa_cpra", "1798.1"],
    ["ccpa_cpra", "1798.81"], // a different section from 1798.81.5
  ])("%s %s", (key, id) => {
    expect(isCitationGrounded(id, key)).toBe(false);
  });
});

describe("verify()", () => {
  it("treats N/A as no citation", () => {
    const base = analyzeLocally(SCENARIOS[0].description, SCENARIOS[0].archetype);
    const r = structuredClone(base);
    r.grounded_frameworks.hipaa.rule = "N/A";
    expect(verify(r).cited).not.toContain("N/A");
  });

  it("flags an invented article and drops the Grounded badge", () => {
    const base = analyzeLocally(SCENARIOS[0].description, SCENARIOS[0].archetype);
    const r = structuredClone(base);
    r.grounded_frameworks.gdpr.article = "Art. 320 & Art. 32";
    const v = verify(r);
    expect(v.unverified).toContain("Art. 320");
    expect(v.verified).toContain("Art. 32");
    expect(v.grounded).toBe(false);
  });

  it.each(SCENARIOS.map((s) => [s.title, s] as const))("demo scenario “%s” is fully grounded", (_t, s) => {
    const v = verify(analyzeLocally(s.description, s.archetype));
    expect(v.unverified).toEqual([]);
    expect(v.grounded).toBe(true);
    expect(v.cited.length).toBeGreaterThan(3);
  });

  it.each([
    ["ransomware", "Ransomware encrypted the backup server and the attackers are demanding payment."],
    ["generic", "A contractor changed a printer configuration in the office without approval."],
  ])("demo archetype %s is fully grounded", (_name, text) => {
    const v = verify(analyzeLocally(text));
    expect(v.unverified).toEqual([]);
    expect(v.grounded).toBe(true);
  });
});

describe("SOC 2 catalog", () => {
  it("lists all 61 Trust Services Criteria (33 common + A, PI, C and P series)", () => {
    expect(soc2.criteria).toHaveLength(61);
    expect(new Set(soc2.criteria.map((c) => c.id)).size).toBe(61);
  });
});

describe("complete catalogs", () => {
  it("NIST CSF 2.0 lists all 106 active subcategories with no duplicates", () => {
    expect(nist.controls).toHaveLength(106);
    expect(new Set(nist.controls.map((c) => c.id)).size).toBe(106);
  });

  it("GDPR lists every article from 1 to 99", () => {
    const ids = new Set(gdpr.articles.map((a) => a.id));
    for (let n = 1; n <= 99; n++) expect(ids.has(`Art. ${n}`)).toBe(true);
  });

  it.each([
    ["nist_csf_2", "GV.OV-01"],
    ["nist_csf_2", "PR.IR-03"],
    ["nist_csf_2", "RC.CO-04"],
    ["gdpr", "Art. 37"],
    ["gdpr", "Art. 82"],
    ["hipaa", "164.310(a)(1)"],
    ["hipaa", "164.310(d)(2)(i)"],
    ["hipaa", "164.308(a)(7)(ii)(D)"],
    ["hipaa", "164.530"],
    ["ccpa_cpra", "1798.135"],
    ["ccpa_cpra", "1798.199.40"],
  ])("%s %s is now grounded", (key, id) => {
    expect(isCitationGrounded(id, key)).toBe(true);
  });

  it("HIPAA has every Security Rule section and no duplicate citations", () => {
    const ids = hipaa.controls.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sec of ["164.308", "164.310", "164.312", "164.314", "164.316"]) {
      expect(ids.some((id) => id.startsWith(sec))).toBe(true);
    }
  });
});
