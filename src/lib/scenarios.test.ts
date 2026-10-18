import { describe, expect, it } from "vitest";
import { analyzeLocally, classify } from "@/lib/analyzer";
import { verify } from "@/lib/grounding";
import { SCENARIOS } from "@/data/scenarios";
import { toReportHtml } from "@/lib/toReportHtml";

describe("demo scenarios", () => {
  it.each(SCENARIOS.map((s) => [s.title, s] as const))("“%s” is recognised from its own text", (_t, s) => {
    expect(classify(s.description)).toBe(s.archetype);
  });

  it("every scenario has its own curated analysis", () => {
    const titles = SCENARIOS.map((s) => analyzeLocally(s.description, s.archetype).incident_title);
    expect(new Set(titles).size).toBe(SCENARIOS.length);
  });

  it.each([
    ["phishing-bec", "Um funcionário digitou a senha numa página falsa de um e-mail de phishing e o golpe trocou os dados bancários da fatura."],
    ["vendor-breach", "O nosso fornecedor terceirizado, operador de dados dos clientes, sofreu um ataque."],
    ["lost-device-phi", "O notebook de uma clínica com prontuários de pacientes foi roubado."],
    ["public-bucket", "Um bucket S3 ficou com acesso público por configuração errada."],
    ["late-notification", "Notificamos a autoridade (ANPD) 9 dias depois, fora do prazo de 72 horas."],
    ["dsar-ignored", "Um titular fez um pedido de acesso e de exclusão dos dados pela LGPD e ninguém respondeu."],
    ["missing-logs", "Não havia logs no servidor e o SIEM não recebia os registros, então não conseguimos saber o que houve."],
    ["unpatched-vpn", "Uma vulnerabilidade conhecida na VPN foi explorada porque o equipamento estava sem patch."],
    ["unapproved-change", "Uma mudança sem aprovação foi feita direto em produção e o portal ficou fora do ar."],
  ])("Portuguese text classifies as %s", (arch, text) => {
    expect(classify(text)).toBe(arch);
    const v = verify(analyzeLocally(text));
    expect(v.unverified).toEqual([]);
  });
});

describe("identity governance scenarios", () => {
  it.each([
    ["privileged-access", "Two admins kept standing global admin rights and nobody reviewed the break-glass account after it was used."],
    ["access-review-failure", "The system owner rubber-stamped the access review and certified their own access on a manually compiled user listing."],
    ["non-human-identity", "A service account with an API token that was never rotated still had interactive login enabled."],
    ["sod-conflict", "After a role change the clerk kept both roles, a segregation of duties conflict that let them approve payments."],
  ])("free text classifies as %s and stays grounded", (arch, text) => {
    expect(classify(text)).toBe(arch);
    expect(verify(analyzeLocally(text)).unverified).toEqual([]);
  });
});

describe("PDF report", () => {
  const base = analyzeLocally(SCENARIOS[0].description, SCENARIOS[0].archetype);

  it("includes the logo, title and every framework", () => {
    const html = toReportHtml({ source: "demo", verification: verify(base), result: base }, "https://x.test/emblem.png");
    expect(html).toContain('src="https://x.test/emblem.png"');
    expect(html).toContain(base.incident_title);
    for (const fw of ["NIST CSF 2.0", "ISO/IEC 27001:2022", "SOC 2", "GDPR", "CCPA/CPRA", "HIPAA"]) expect(html).toContain(fw);
  });

  it("escapes model output so it cannot inject HTML", () => {
    const evil = { ...base, incident_title: '<img src=x onerror="alert(1)">' };
    const html = toReportHtml({ source: "llm", model: "m", verification: verify(evil), result: evil }, "l.png");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
