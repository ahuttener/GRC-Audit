import { describe, expect, it } from "vitest";
import { isCitationGrounded, verify } from "@/lib/grounding";
import { analyzeLocally, classify } from "@/lib/analyzer";
import { SCENARIOS } from "@/data/scenarios";
import { toMarkdown } from "@/lib/toMarkdown";
import { toReportHtml } from "@/lib/toReportHtml";
import aiuc from "@/data/frameworks/aiuc-1.json";

describe("AIUC-1 catalog", () => {
  it("holds the 50 active requirements across the six domains", () => {
    expect(aiuc.requirements).toHaveLength(50);
    expect(new Set(aiuc.requirements.map((r) => r.id[0]))).toEqual(new Set(["A", "B", "C", "D", "E", "F"]));
  });

  it.each(["B006", "D003", "A006", "E016", "F002"])("accepts the real requirement %s", (id) => {
    expect(isCitationGrounded(id, "aiuc_1")).toBe(true);
  });

  it.each([
    ["C011", "retired in the Q4 2026 update"],
    ["D002", "retired in the Q4 2026 update"],
    ["E007", "merged into E004"],
    ["E014", "merged into E017"],
    ["B011", "does not exist"],
    ["B00", "partial ID"],
    ["G001", "no such domain"],
  ])("rejects %s (%s)", (id) => {
    expect(isCitationGrounded(id, "aiuc_1")).toBe(false);
  });

  it("flags an invented AIUC-1 requirement in an otherwise grounded result", () => {
    const base = analyzeLocally("", "prompt-injection");
    const r = { ...base, grounded_frameworks: { ...base.grounded_frameworks, aiuc_1: { requirements: "B006, B099", name: "x", audit_finding: "y" } } };
    const v = verify(r);
    expect(v.unverified).toEqual(["B099"]);
    expect(v.grounded).toBe(false);
  });
});

describe("AI incidents", () => {
  const ai = SCENARIOS.filter((s) => ["prompt-injection", "agent-unauthorized-action", "ai-hallucination", "shadow-ai"].includes(s.archetype));

  it.each(ai.map((s) => [s.title, s] as const))("“%s” cites AIUC-1 and is grounded", (_t, s) => {
    const r = analyzeLocally(s.description, s.archetype);
    expect(r.grounded_frameworks.aiuc_1?.requirements).toMatch(/^[A-F]\d{3}/);
    expect(verify(r).grounded).toBe(true);
  });

  it("non-AI incidents show AIUC-1 as not applicable in the exports", () => {
    const r = analyzeLocally(SCENARIOS[0].description, SCENARIOS[0].archetype);
    expect(r.grounded_frameworks.aiuc_1).toBeUndefined();
    const resp = { source: "demo" as const, verification: verify(r), result: r };
    expect(toMarkdown(resp)).toContain("AIUC-1 (AI agents)");
    expect(toReportHtml(resp, "l.png")).toContain("Not applicable — no AI system or agent is involved.");
  });

  it.each([
    ["prompt-injection", "Alguém fez injeção de prompt com instruções escondidas no ticket e o agente de IA vazou dados de clientes."],
    ["agent-unauthorized-action", "O agente autônomo de código apagou a tabela de produção sem aprovação humana."],
    ["ai-hallucination", "O chatbot inventou uma política de reembolso que não existe."],
    ["shadow-ai", "Funcionários colaram dados de clientes numa IA generativa pública."],
  ])("Portuguese text classifies as %s", (arch, text) => {
    expect(classify(text)).toBe(arch);
  });
});
