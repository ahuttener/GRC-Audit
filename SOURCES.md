# GRC Audit — Official framework sources & downloads

Where the data comes from. GRC Audit does not rely on model memory for control IDs: each catalog in
[`src/data/frameworks/`](src/data/frameworks/) holds the official control identifiers and titles, and
the grounding layer verifies every cited ID against them (the green **"Grounded"** badge). The IDs and
titles are verified against the official sources below.

> **Free vs paid:** NIST, SOC 2 (AICPA), GDPR, HIPAA, CCPA and AIUC-1 publish their official text **for free**.
> **ISO/IEC 27001 is a paid standard** — there is no free legal download, so the app references only its
> official control IDs and short titles (factual references), never the standard's text.

| Framework | Version | Official download / text | Free? |
|---|---|---|---|
| NIST CSF 2.0 | 2.0 (2024) | PDF + Reference Tool (below) | ✅ |
| ISO/IEC 27001 Annex A | 2022 | Purchase only (below) | ❌ paid |
| SOC 2 — Trust Services Criteria | 2017 / rev. 2022 | AICPA PDF (below) | ✅ |
| GDPR | Reg. (EU) 2016/679 | EUR-Lex (below) | ✅ |
| HIPAA Security/Breach | 45 CFR Part 164 | eCFR (below) | ✅ |
| CCPA / CPRA | Cal. Civ. Code 1798.100+ | California OAG / leginfo (below) | ✅ |
| AIUC-1 — AI agent standard | Q4 2026 (updated 15 Oct 2026) | standard.aiuc-1.com (below) | ✅ |

## Direct links

### NIST Cybersecurity Framework 2.0 (free)
- Publication: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
- Official PDF: https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
- CSF 2.0 Reference Tool (export the Core as JSON/Excel): https://csrc.nist.gov/projects/cybersecurity-framework
- Framework home: https://www.nist.gov/cyberframework

### ISO/IEC 27001:2022 — Annex A (paid)
- Standard (purchase): https://www.iso.org/standard/27001
- Note: paid/copyrighted. The 93 Annex A control IDs and short titles are public references and are what
  this app uses; the full control text requires buying the standard.

### SOC 2 — AICPA Trust Services Criteria (free)
- Official PDF (2017 criteria with 2022 revised points of focus):
  https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022

### GDPR — Regulation (EU) 2016/679 (free)
- Official text (EUR-Lex, HTML): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Official PDF (EUR-Lex): https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679

### HIPAA — 45 CFR Part 164 (free)
- eCFR (always-current official text): https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164
- HHS Security Rule hub: https://www.hhs.gov/hipaa/for-professionals/security/index.html

### CCPA / CPRA — California (free)
- California Attorney General (CCPA): https://oag.ca.gov/privacy/ccpa
- Statute text (leginfo, Civil Code 1798.100 et seq.): https://leginfo.legislature.ca.gov
- CPRA regulations (CPPA, CCR Title 11): https://cppa.ca.gov/regulations/

### AIUC-1 — AI agent standard (free)
- Standard home (Artificial Intelligence Underwriting Company): https://www.aiuc-1.com/
- Requirements by domain: https://standard.aiuc-1.com/ — Data & Privacy (A), Security (B), Safety (C),
  Reliability (D), Accountability (E), Society (F)
- Changelog: https://standard.aiuc-1.com/changelog
- The catalog holds the 50 active requirements (A001–F002) with their official titles and
  Mandatory/Optional labels. Retired or merged requirements (C011, C012, D002, E007, E014) are left out on
  purpose, so a citation of them is flagged as unverified.
- Certification combines an audit of controls with adversarial testing of the agent itself (quarterly
  third-party testing requirements A009, B001, C010, D004, E018).

## Honest scope
- The catalogs cover the controls relevant to incident-to-framework mapping — not a full reproduction of
  each standard. The official source above is the complete, authoritative text.
- Automated output is an indicator to support a qualified assessor, not a certification or legal advice.
  Always confirm a finding and any notification deadline against the primary source.
