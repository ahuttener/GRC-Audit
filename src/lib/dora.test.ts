import { describe, expect, it } from "vitest";
import { isCitationGrounded, verify } from "@/lib/grounding";
import { analyzeLocally, classify } from "@/lib/analyzer";
import { SCENARIOS } from "@/data/scenarios";
import { toMarkdown } from "@/lib/toMarkdown";
import { toReportHtml } from "@/lib/toReportHtml";
import dora from "@/data/frameworks/dora.json";

describe("DORA catalog", () => {
  it("holds all 64 articles of Regulation (EU) 2022/2554, in order", () => {
    expect(dora.articles).toHaveLength(64);
    expect(dora.articles.map((a) => a.id)).toEqual(Array.from({ length: 64 }, (_, i) => `Art. ${i + 1}`));
  });

  it("keeps the official titles of the key articles", () => {
    const title = (id: string) => dora.articles.find((a) => a.id === id)?.name;
    expect(title("Art. 19")).toBe("Reporting of major ICT-related incidents and voluntary notification of significant cyber threats");
    expect(title("Art. 28")).toBe("General principles");
    expect(title("Art. 30")).toBe("Key contractual provisions");
    expect(title("Art. 26")).toBe("Advanced testing of ICT tools, systems and processes based on TLPT");
  });

  it.each(["Art. 5", "Art. 19", "Art. 19(4)", "Art. 9(4)(e)", "Art. 64"])("accepts the real citation %s", (id) => {
    expect(isCitationGrounded(id, "dora")).toBe(true);
  });

  it.each([
    ["Art. 65", "DORA has 64 articles"],
    ["Art. 99", "a GDPR article number, not DORA"],
    ["Art. 0", "does not exist"],
  ])("rejects %s (%s)", (id) => {
    expect(isCitationGrounded(id, "dora")).toBe(false);
  });

  it("flags an invented DORA article in an otherwise grounded result", () => {
    const base = analyzeLocally("", "dora-cloud-outage");
    const r = { ...base, grounded_frameworks: { ...base.grounded_frameworks, dora: { article: "Art. 28 & Art. 70", name: "x", regulatory_risk: "y" } } };
    const v = verify(r);
    expect(v.unverified).toEqual(["Art. 70"]);
    expect(v.grounded).toBe(false);
  });
});

describe("DORA incidents", () => {
  const fin = SCENARIOS.filter((s) => s.archetype.startsWith("dora-"));

  it("ships three EU financial-sector examples", () => {
    expect(fin).toHaveLength(3);
  });

  it.each(fin.map((s) => [s.title, s] as const))("“%s” cites DORA and is grounded", (_t, s) => {
    const r = analyzeLocally(s.description, s.archetype);
    expect(r.grounded_frameworks.dora?.article).toMatch(/^Art\. \d+/);
    expect(verify(r).grounded).toBe(true);
  });

  it("every DORA example cites incident reporting (Art. 19)", () => {
    for (const s of fin) {
      expect(analyzeLocally(s.description, s.archetype).grounded_frameworks.dora?.article).toContain("Art. 19");
    }
  });

  it("only the insurer data theft triggers GDPR breach notification", () => {
    const art = (a: string) => analyzeLocally("", a).grounded_frameworks.gdpr.article;
    expect(art("dora-insurer-ransomware")).toContain("Art. 33");
    expect(art("dora-cloud-outage")).not.toContain("Art. 33");
    expect(art("dora-payments-outage")).not.toContain("Art. 33");
  });

  it("non-financial incidents show DORA as not applicable in the exports", () => {
    const r = analyzeLocally(SCENARIOS[0].description, SCENARIOS[0].archetype);
    expect(r.grounded_frameworks.dora).toBeUndefined();
    const resp = { source: "demo" as const, verification: verify(r), result: r };
    expect(toMarkdown(resp)).toContain("DORA (EU financial sector)");
    expect(toReportHtml(resp, "l.png")).toContain("Not applicable — not an EU financial entity.");
  });

  it.each(fin.map((s) => [s.archetype, s.description] as const))("its own text classifies as %s", (arch, text) => {
    expect(classify(text)).toBe(arch);
  });

  it.each([
    ["dora-cloud-outage", "O internet banking do banco ficou fora do ar porque o único provedor de nuvem caiu e não havia estratégia de saída."],
    ["dora-insurer-ransomware", "Um ransomware criptografou o sistema de sinistros da seguradora e roubou dados dos segurados."],
  ])("Portuguese text classifies as %s", (arch, text) => {
    expect(classify(text)).toBe(arch);
  });
});
