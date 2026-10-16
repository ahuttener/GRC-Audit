# Official sources & grounding

GRC Audit does not rely on model memory for control identifiers. Each framework catalog in
[`src/data/frameworks/`](src/data/frameworks/) carries the official control IDs and titles, and the
grounding layer ([`src/lib/grounding.ts`](src/lib/grounding.ts)) verifies that every ID the tool
cites exists in those catalogs before showing the green **"Grounded"** badge.

The control IDs and titles are **verified against the official sources below**. For paid/copyrighted
standards (ISO/IEC 27001, SOC 2) only the **official identifier and short title** are referenced —
factual references — and the standards' text is **not** reproduced.

| Framework | Version | Official source |
|---|---|---|
| NIST Cybersecurity Framework | 2.0 (CSWP 29) | https://doi.org/10.6028/NIST.CSWP.29 · https://www.nist.gov/cyberframework |
| ISO/IEC 27001 Annex A | 2022 | https://www.iso.org/standard/27001 (paid standard) |
| SOC 2 — Trust Services Criteria | 2017 / rev. 2022 | https://www.aicpa-cima.com/resources/landing/trust-services-criteria (AICPA) |
| GDPR | Reg. (EU) 2016/679 | https://eur-lex.europa.eu/eli/reg/2016/679/oj |
| CCPA / CPRA | Cal. Civ. Code 1798.100+ | https://oag.ca.gov/privacy/ccpa · https://leginfo.legislature.ca.gov |
| HIPAA Security/Breach Rules | 45 CFR Part 164 | https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164 |

## Honest scope

- The catalogs cover the controls relevant to incident-to-framework mapping. They are not a full
  reproduction of each standard — the official source above is the complete, authoritative text.
- Verified spot-checks include, e.g., NIST CSF 2.0 `PR.AA-01` ("Identities and credentials for
  authorized users, services, and hardware are managed") and GDPR `Art. 32/33/34`.
- Automated output is an indicator to support a qualified assessor, not a certification or legal
  advice. Always confirm a finding and any notification deadline against the primary source.
