# GRC Audit — Incident → Framework Diagnostic & Remediation

**Describe a security incident in plain language. Get an auditor-grade, framework-mapped
diagnosis — with control IDs verified against official catalogs, not hallucinated.**

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Grounded](https://img.shields.io/badge/anti--hallucination-grounded-success)
![Frameworks](https://img.shields.io/badge/NIST%20·%20ISO%2027001%20·%20SOC%202%20·%20GDPR%20·%20CCPA%20·%20HIPAA-6f42c1)

A production-style web app by [CyberSecInfo](https://cybersecinfo.com). It translates a
real-world incident, misconfiguration or audit finding into:

1. **Severity + failure category** (Critical/High/Medium/Low).
2. **Grounded multi-framework mapping** — NIST CSF 2.0, ISO/IEC 27001:2022, SOC 2,
   GDPR, CCPA/CPRA and HIPAA, with the exact control/article IDs.
3. **Audit evidence** an assessor will request (logs, tickets, policies).
4. **A 3-step remediation roadmap** — immediate containment → leak investigation &
   legal/notification (e.g. GDPR 72h) → permanent systemic fix.

Then **Copy** or **Export to Markdown**.

---

## Anti-hallucination: local grounding (lightweight RAG)

The app does **not** rely on broad LLM memory for control IDs. Official framework catalogs
are embedded in [`src/data/frameworks/`](src/data/frameworks/):

| File | Catalog |
|---|---|
| `nist-csf-2.0.json` | NIST CSF 2.0 functions, categories & subcategories (PR.AA, GV.SC, DE.CM…) |
| `iso-27001-2022.json` | **All 93** ISO/IEC 27001:2022 Annex A controls |
| `gdpr-official.json` | Key GDPR articles (Art. 5, 25, 32, 33, 34, 44…) |
| `hipaa-security-privacy.json` | 45 CFR §164.308/.312/.400 Security & Breach rules |
| `soc-2-tsc.json` | AICPA Trust Services Criteria (CC1–CC9, A/C/P) |
| `ccpa-cpra.json` | Cal. Civ. Code §1798.100 / .81.5 / .82 / .150… |

On every request the engine:

1. **Retrieves** the most relevant controls from the catalogs and injects them into the
   prompt (`src/lib/grounding.ts → retrieveContext`).
2. Instructs the model to **cite only IDs that appear in that context** (strict system
   prompt in `src/lib/prompt.ts`).
3. **Verifies** every cited ID against the catalogs after generation (`verify()`), and the
   UI shows a green *"Grounded — N control IDs verified"* badge (or flags any unverified ID).

The built-in **demo engine** draws its IDs straight from the catalogs, so it is always 100% grounded.

---

## Runs with zero setup (demo mode)

Without any API key the app uses a local analysis engine with four curated, framework-accurate
scenarios plus a keyword classifier for free text — enough to run and demo everything.

Add a key to enable full LLM analysis of **any** incident.

```bash
npm install
cp .env.example .env.local      # optional — add a key for LLM mode
npm run dev                     # http://localhost:3000
```

### Configure the API key (`.env.local`)

```bash
# Optional. Without a key, the app runs in demo mode.
ANTHROPIC_API_KEY=sk-ant-...        # Claude (used if set)
# OPENAI_API_KEY=sk-...             # OpenAI (alternative)
# LLM_MODEL=claude-haiku-5-5        # default; or claude-sonnet-5-5 / gpt-4o-mini
```

> **Note:** an Anthropic **API key** (console.anthropic.com, pay-as-you-go) is separate from a
> Claude.ai subscription. The key is read server-side from the environment — it is never shipped
> to the browser and must never be committed.

---

## Quick-test scenarios

One-click pills load realistic audit findings: **Zombie Account**, **Public API Key & Secret
Exposure**, **Customer Data Leak via Unencrypted Channel**, **Missing MFA on Cloud Infrastructure**.

## Response schema (`POST /api/audit-incident`)

Returns `{ source, model?, verification, result }`, where `result` matches
[`src/types/grc.ts`](src/types/grc.ts): `incident_title`, `incident_summary`, `severity_level`,
`failure_category`, `grounded_frameworks` (the six framework objects), `audit_evidence_required`,
and `remediation_plan` (three steps).

## Project structure

```
src/
  app/
    page.tsx                     dashboard (client)
    api/audit-incident/route.ts  grounding → LLM or demo → verify
  components/                    Header, IncidentConsole, ResultView,
                                 FrameworkMatrix, EvidenceCard, RemediationRoadmap, …
  data/
    frameworks/*.json            embedded official catalogs (grounding source)
    scenarios.ts                 the 4 quick-test scenarios
  lib/
    grounding.ts                 retrieve + verify against catalogs
    prompt.ts / llm.ts           grounded prompt + Anthropic/OpenAI call
    analyzer.ts                  local demo engine (grounded)
    toMarkdown.ts                export
  types/grc.ts                   response schema
```

## Deploy

- **Vercel (recommended, free):** import the repo, add `ANTHROPIC_API_KEY` as an environment
  variable, deploy, then point a subdomain (e.g. `grc-audit.cybersecinfo.com`) at it.
- **Node host (e.g. Hostinger Node.js app):** `npm run build && npm run start` behind the
  subdomain. Next.js needs a Node runtime — this is not a static upload.

## Disclaimer

Educational / portfolio project. Automated output is an indicator to support an assessor, not a
certification or legal advice. Confirm every finding and notification deadline against the
primary source and qualified counsel.

Built by **Adriano Huttener** — MSc Cybersecurity (National College of Ireland) · [CyberSecInfo](https://cybersecinfo.com)
