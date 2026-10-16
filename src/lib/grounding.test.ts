import { describe, expect, it } from "vitest";
import { isCitationGrounded, verify } from "@/lib/grounding";
import { analyzeLocally } from "@/lib/analyzer";
import { SCENARIOS } from "@/data/scenarios";

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
    ["ccpa_cpra", "1798.100(e)"],
    ["ccpa_cpra", "1798.81.5"],
  ])("%s %s", (key, id) => {
    expect(isCitationGrounded(id, key)).toBe(true);
  });
});

describe("isCitationGrounded — look-alike IDs are rejected (regression for the prefix bug)", () => {
  it.each([
    ["gdpr", "Art. 3"], // used to pass because "Art. 32" starts with it
    ["gdpr", "Art. 50"], // used to pass because it starts with "Art. 5"
    ["gdpr", "Art. 99"], // used to pass because it starts with "Art. 9"
    ["gdpr", "Art. 1"], // used to pass because "Art. 15-22" starts with it
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
    r.grounded_frameworks.gdpr.article = "Art. 3 & Art. 32";
    const v = verify(r);
    expect(v.unverified).toContain("Art. 3");
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
