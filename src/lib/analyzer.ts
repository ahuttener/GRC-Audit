// Local demo analysis engine — no API key required. Classifies the incident into an
// archetype and returns a curated AuditResult whose control IDs are drawn directly from
// the embedded official catalogs, so the grounding verifier always passes.

import type { AuditResult, FailureCategory, SeverityLevel } from "@/types/grc";

type Archetype =
  | "zombie-account"
  | "secret-exposure"
  | "data-leak"
  | "missing-mfa"
  | "ransomware"
  | "phishing-bec"
  | "vendor-breach"
  | "lost-device-phi"
  | "public-bucket"
  | "late-notification"
  | "dsar-ignored"
  | "missing-logs"
  | "unpatched-vpn"
  | "unapproved-change"
  | "prompt-injection"
  | "agent-unauthorized-action"
  | "ai-hallucination"
  | "shadow-ai"
  | "generic";

// Bilingual (EN + PT-BR) keyword hints so typed incidents classify in demo mode.
const KEYWORDS: Record<Exclude<Archetype, "generic">, string[]> = {
  "zombie-account": ["terminated", "orphan", "offboard", "deprovision", "access review",
    "former employee", "leaver", "still had", "active login", "unrevoked", "dormant",
    "demitido", "desligado", "ex-funcion", "conta órfã", "conta orfa", "acesso ativo",
    "revisão de acesso", "revisao de acesso", "ainda tinha acesso", "login ativo"],
  "secret-exposure": ["api key", "secret key", "secret", "credentials", "committed", "github",
    "repository", "repo", "aws root", "root secret", "hardcoded", "exposed key", "access key",
    "chave de api", "chave secreta", "credenciais", "segredo", "repositório", "repositorio",
    "chave aws", "chave exposta", "commitou", "subiu a chave"],
  "data-leak": ["spreadsheet", "personal inbox", "emailed", "exfiltrat", "leak", "unencrypted",
    "downloaded", "external inbox", "forwarded", "personal email", "customer data",
    "planilha", "e-mail pessoal", "email pessoal", "gmail pessoal", "baixou", "vazou", "vazamento",
    "cartão de crédito", "cartao de credito", "clientes", "conta pessoal", "trabalhar de casa",
    "mandou para o", "enviou para o", "exfiltr"],
  "missing-mfa": ["mfa", "multi-factor", "multi factor", "2fa", "two-factor", "without mfa",
    "no mfa", "not configured with", "autenticação", "autenticacao", "dois fatores",
    "sem mfa", "duplo fator", "múltiplo fator"],
  ransomware: ["ransom", "ransomware", "encrypted the", "malware", "backup server", "locked out",
    "extortion", "resgate", "sequestr", "criptografou os", "cópia de segurança"],
  "phishing-bec": ["phishing", "phish", "fake login", "mailbox", "inbox rule", "spoofed",
    "business email compromise", "invoice", "wire transfer", "bank details", "impersonat",
    "e-mail falso", "página falsa", "golpe", "fatura", "boleto", "dados bancários", "caixa de correio"],
  "vendor-breach": ["vendor", "supplier", "third-party", "third party", "processor", "saas provider",
    "service provider", "subcontract", "onboarded", "fornecedor", "terceiro", "terceirizad",
    "prestador", "operador de dados", "parceiro"],
  "lost-device-phi": ["laptop", "stolen", "lost device", "patient", "ephi", "protected health",
    "clinic", "hospital", "diagnos", "medical", "remote wipe", "notebook", "roubad", "furtad",
    "perdido", "paciente", "prontuário", "prontuario", "clínica", "clinica", "médic"],
  "public-bucket": ["s3", "bucket", "publicly accessible", "public access", "misconfigur",
    "blob storage", "storage account", "anyone with the link", "open to the internet",
    "bucket público", "acesso público", "configuração errada", "configuracao errada", "aberto na internet"],
  "late-notification": ["72-hour", "72 hour", "72h", "72 horas", "notified", "notification deadline",
    "supervisory authority", "regulator", "escalated", "late notification", "deadline",
    "notificad", "notificação", "prazo", "atraso", "atrasad", "autoridade", "anpd"],
  "dsar-ignored": ["data subject", "access request", "subject access", "dsar", "erasure",
    "right to delete", "deletion request", "opt-out", "opt out", "do not sell", "copy of their",
    "titular", "direito de acesso", "pedido de acesso", "exclusão dos dados", "apagar meus dados",
    "cópia dos meus dados", "lgpd"],
  "missing-logs": ["no logs", "logging was disabled", "logging", "log retention", "audit log",
    "siem", "could not determine", "no visibility", "logs were", "sem logs", "registros",
    "retenção de logs", "não havia logs", "nao havia logs", "não conseguimos saber"],
  "unpatched-vpn": ["unpatched", "patch", "cve", "vpn", "vulnerability", "exploited", "zero-day",
    "asset inventory", "scanning", "firewall", "sem patch", "vulnerabilidade", "atualização de segurança",
    "não atualizad", "nao atualizad", "explorad"],
  "unapproved-change": ["change request", "change management", "change ticket", "unapproved change",
    "hotfix", "outage", "rollback", "downtime", "deployed directly", "peer review", "change advisory",
    "mudança", "mudanca", "fora do ar", "indisponib", "sem aprovação", "sem aprovacao", "direto em produção"],
  "prompt-injection": ["prompt injection", "injected prompt", "hidden instructions", "hidden prompt",
    "jailbreak", "adversarial input", "ai agent", "ai customer-support agent", "llm agent",
    "injeção de prompt", "instruções escondidas", "agente de ia", "agente de atendimento"],
  "agent-unauthorized-action": ["coding agent", "autonomous", "ai coding", "destructive command",
    "dropped", "drop table", "tool calls", "without human approval", "agent deleted",
    "agente de código", "agente autônomo", "agente apagou", "apagou a tabela", "sem aprovação humana"],
  "ai-hallucination": ["hallucinat", "chatbot", "invented", "made up", "does not exist", "fabricated",
    "talking to an ai", "llm", "alucin", "inventou", "não existe", "nao existe", "robô de atendimento"],
  "shadow-ai": ["shadow ai", "public ai", "generative ai", "chatgpt", "model training", "pasted",
    "ai acceptable use", "ai vendor", "ia generativa", "ia pública", "ia publica", "colaram", "colou",
    "treinamento do modelo"],
};

export function classify(incident: string): Archetype {
  const t = incident.toLowerCase();
  let best: Archetype = "generic";
  let bestScore = 0;
  (Object.keys(KEYWORDS) as Exclude<Archetype, "generic">[]).forEach((arch) => {
    const score = KEYWORDS[arch].reduce((s, kw) => (t.includes(kw) ? s + 1 : s), 0);
    if (score > bestScore) {
      bestScore = score;
      best = arch;
    }
  });
  return best;
}

const CURATED: Record<Exclude<Archetype, "generic">, AuditResult> = {
  "zombie-account": {
    incident_title: "Orphaned (Zombie) Account — Terminated Employee Retains Access",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via automated SCIM deprovisioning and quarterly access recertification" },
    incident_summary:
      "A terminated employee retained active Google Workspace and CRM credentials for roughly three months, caught by a quarterly access review — a failure of leaver deprovisioning.",
    severity_level: "High",
    failure_category: "Identity & Access Management",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.AA-01, PR.AA-05", function_name: "PROTECT — Identity Management, Authentication & Access Control" },
      iso_27001_2022: { control_id: "A.5.18 & A.6.5", control_name: "Access rights / Responsibilities after termination", category: "Organizational & People", audit_finding: "Non-conformity: access rights not removed on termination (A.5.18) and post-employment responsibilities not enforced (A.6.5)." },
      soc_2: { criteria: "CC6.2, CC6.3", name: "Logical access — registration & timely revocation", audit_finding: "Testing exception in a SOC 2 Type 2 operating-effectiveness sample for access removal on termination." },
      gdpr: { article: "Art. 32 & Art. 5(1)(f)", name: "Security of processing; integrity & confidentiality", regulatory_risk: "Personal data in the CRM was accessible to an unauthorized former user; Art. 32 inadequacy and, if misused, a notifiable breach." },
      ccpa_cpra: { section: "1798.81.5", name: "Duty to maintain reasonable security procedures", regulatory_risk: "Statutory non-compliance if California consumer records were reachable by the orphaned account." },
      hipaa: { rule: "164.308(a)(3)(ii)(C)", name: "Termination procedures (Administrative Safeguards)", regulatory_risk: "Direct violation of workforce-termination access revocation IF the systems hold ePHI; otherwise not applicable." },
    },
    audit_evidence_required: [
      "HR termination record showing the official departure date.",
      "Google Workspace admin audit log: account status and last-login timestamp.",
      "Deprovisioning ticket/workflow timestamps versus the revocation SLA.",
      "The quarterly User Access Review (UAR) workpaper where the exception was detected.",
      "Offboarding checklist and access-revocation policy.",
      "CRM login/audit logs covering the three-month orphan window.",
    ],
    remediation_plan: {
      step_1_containment:
        "Immediately suspend the account in Google Workspace and the CRM, force sign-out and revoke active sessions, OAuth tokens and app passwords; disable (do not delete) to preserve evidence and remove any mail-forwarding rules or delegates.",
      step_2_leak_and_legal:
        "Review login history since the termination date to confirm whether the account was used and what data was accessed or exported during the 3-month window; if personal data was accessed by an unauthorized party, assess GDPR Art. 33 (72-hour DPA notification) and California 1798.82 triggers and log it in the Art. 33(5) breach register.",
      step_3_permanent_fix:
        "Automate deprovisioning via an HRIS→IdP (SCIM) integration so termination instantly revokes access, enforce a joiner-mover-leaver workflow with a same-day revocation SLA, and run automated monthly orphan/dormant-account scans plus quarterly access recertification.",
    },
  },

  "secret-exposure": {
    incident_title: "Public Exposure of Production Secrets & AWS Root Key",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via a secrets manager, immediate key rotation and push-protection; TRANSFER residual breach cost via cyber insurance" },
    incident_summary:
      "Production database credentials and an AWS root secret key were committed to a public GitHub repository and exposed for 48 hours — a critical, potentially account-wide compromise.",
    severity_level: "Critical",
    failure_category: "Cloud Misconfiguration",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.AA-01, PR.DS-01, PR.PS-06", function_name: "PROTECT — Identity, Data Security & Platform Security" },
      iso_27001_2022: { control_id: "A.5.17 & A.8.24", control_name: "Authentication information / Use of cryptography", category: "Organizational & Technological", audit_finding: "Secrets not protected and key lifecycle/rotation failed; secure coding (A.8.28) also implicated." },
      soc_2: { criteria: "CC6.1, CC7.1", name: "Logical access & vulnerability detection", audit_finding: "Credential confidentiality not maintained and no secret-scanning/push-protection control operating effectively." },
      gdpr: { article: "Art. 32", name: "Security of processing", regulatory_risk: "If the database holds personal data, exposure triggers a breach assessment under Art. 33/34 (72-hour DPA notification)." },
      ccpa_cpra: { section: "1798.150 & 1798.81.5", name: "Private right of action / reasonable security", regulatory_risk: "Statutory-damages liability if nonencrypted California PI was exposed and exfiltrated." },
      hipaa: { rule: "164.312(a)(2)(iv)", name: "Encryption and decryption", regulatory_risk: "If the database holds ePHI, encryption and breach-response (164.308(a)(6)) obligations apply; otherwise not applicable." },
    },
    audit_evidence_required: [
      "The commit hash, diff and author identity.",
      "GitHub audit log and secret-scanning / push-protection alerts.",
      "AWS CloudTrail covering the exposed key's activity across the 48-hour window.",
      "IAM credential report (root key 'last used' timestamp).",
      "Inventory of resources the DB credential and root key could reach; the incident ticket.",
    ],
    remediation_plan: {
      step_1_containment:
        "Immediately deactivate and delete the exposed AWS key, rotate ALL potentially affected credentials and the database password, enable MFA on root and stop using it; purge the secret from git history (git filter-repo/BFG) while continuing to treat it as compromised.",
      step_2_leak_and_legal:
        "Analyze CloudTrail across the 48-hour window for anomalous API calls (new IAM users/keys, resource creation, data access, billing spikes) and determine whether the database was reached; if personal data was exfiltrated, trigger GDPR Art. 33 (72h)/34, California 1798.82 (AG if >500 residents) and card-brand/PCI notification for any cardholder data.",
      step_3_permanent_fix:
        "Eliminate long-lived root/IAM keys for humans in favour of IAM Identity Center (SSO) with short-lived STS roles and least privilege, adopt a secrets manager, and enforce GitHub secret-scanning push protection plus pre-commit hooks (gitleaks) and CI secret/SAST scanning.",
    },
  },

  "data-leak": {
    incident_title: "Insider Exfiltration of Customer PII to a Personal Inbox",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via DLP and least privilege; TRANSFER residual liability via cyber insurance" },
    incident_summary:
      "A support agent emailed an unencrypted spreadsheet of 5,000 EU and California customers (names, emails, card expiration dates) to a personal inbox — a confirmed cross-border personal-data breach.",
    severity_level: "Critical",
    failure_category: "Data Leakage",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.DS-02, PR.AA-05, DE.CM-03", function_name: "PROTECT & DETECT — Data Security and Monitoring" },
      iso_27001_2022: { control_id: "A.8.12 & A.5.14", control_name: "Data leakage prevention / Information transfer", category: "Technological & Organizational", audit_finding: "No DLP prevented bulk export to personal email and PII transfer rules were not enforced (privacy A.5.34 also implicated)." },
      soc_2: { criteria: "CC6.7, C1.1", name: "Restrict movement of information / Confidentiality", audit_finding: "Confidential data moved to an unauthorized external location — a confidentiality control exception." },
      gdpr: { article: "Art. 33 & Art. 34", name: "Breach notification to the DPA and data subjects", regulatory_risk: "72-hour DPA notification and high-risk notification to EU data subjects; Art. 44 transfer concern if the inbox sits outside the EEA." },
      ccpa_cpra: { section: "1798.82 & 1798.150", name: "Breach notification / private right of action", regulatory_risk: "Notify affected Californians; exposure of nonencrypted PI including financial data creates statutory-damages liability." },
      hipaa: { rule: "N/A", name: "Breach Notification Rule", regulatory_risk: "Not applicable — no health data indicated; if any record were PHI, 164.400–414 would apply." },
    },
    audit_evidence_required: [
      "Email gateway / DLP logs showing the outbound message, attachment and recipient.",
      "The spreadsheet and a data inventory (fields, 5,000 rows, EU vs California split).",
      "The agent's access and download logs from the source system.",
      "DLP, data-classification and acceptable-use policies plus the agent's acknowledgement.",
      "Incident timeline and evidence of recall/deletion attempts.",
    ],
    remediation_plan: {
      step_1_containment:
        "Attempt message recall and, on managed devices, retract/wipe the attachment; contact the recipient account to confirm deletion with written attestation; suspend the agent's data access pending investigation, preserve all logs and engage the DPO/legal immediately.",
      step_2_leak_and_legal:
        "Confirm exact data elements, record count and EU vs California split and assess risk (financial data → high risk); notify the lead EU DPA within 72h (Art. 33) and affected EU subjects (Art. 34), notify California residents without unreasonable delay (1798.82) and the CA AG if >500, notify card brands if PCI applies, and document in the breach register.",
      step_3_permanent_fix:
        "Deploy DLP to block personal-data egress to personal/external email and unencrypted bulk attachments, enforce least privilege and remove bulk-export rights from front-line roles, encrypt data in transit and at rest, and run recurring data-handling awareness training.",
    },
  },

  "missing-mfa": {
    incident_title: "Privileged Production Accounts Without MFA",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via enforced MFA and federated SSO with least privilege" },
    incident_summary:
      "An internal audit found 12 engineering accounts with administrative access to production AWS that are not protected by MFA — a high-risk strong-authentication gap on privileged access.",
    severity_level: "High",
    failure_category: "Identity & Access Management",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.AA-01, PR.AA-03", function_name: "PROTECT — Identity Management, Authentication & Access Control" },
      iso_27001_2022: { control_id: "A.8.5 & A.8.2", control_name: "Secure authentication / Privileged access rights", category: "Technological", audit_finding: "MFA not enforced for privileged logins; elevated access lacks commensurate authentication controls." },
      soc_2: { criteria: "CC6.1, CC6.6", name: "Logical access controls incl. MFA", audit_finding: "Single-factor privileged access is a logical-access control exception in a SOC 2 examination." },
      gdpr: { article: "Art. 32", name: "Security of processing", regulatory_risk: "MFA is an expected measure for administrative access to systems processing personal data (Art. 32(1))." },
      ccpa_cpra: { section: "1798.81.5", name: "Reasonable security procedures", regulatory_risk: "Recognized frameworks (CIS/NIST) treat MFA on administrators as baseline 'reasonable security'." },
      hipaa: { rule: "164.312(d)", name: "Person or entity authentication", regulatory_risk: "If production processes ePHI, strong authentication is expected; otherwise not applicable." },
    },
    audit_evidence_required: [
      "IAM credential report showing MFA status for each account.",
      "The 12 accounts and their attached policies/privileges.",
      "CloudTrail sign-in records for those accounts.",
      "The authentication/MFA policy and any prior exception approvals.",
      "The access-review workpaper that flagged the gap; SSO/IdP configuration.",
    ],
    remediation_plan: {
      step_1_containment:
        "Enforce MFA on the 12 accounts immediately (and across all privileged accounts); where a change window is required, restrict and closely monitor them in the interim and review CloudTrail for suspicious use.",
      step_2_leak_and_legal:
        "Determine whether any of the 12 accounts were compromised or misused (sign-in source IPs, anomalous actions); absent evidence of compromise no external notification is required, but if a privileged account was abused and personal data was at risk, assess GDPR Art. 33 (72h).",
      step_3_permanent_fix:
        "Enforce MFA org-wide via policy (deny sensitive actions unless aws:MultiFactorAuthPresent is true), move humans to federated SSO (IAM Identity Center) with phishing-resistant MFA and short-lived credentials, replace standing admin with just-in-time access, and alert on any privileged login without MFA.",
    },
  },

  ransomware: {
    incident_title: "Ransomware Reached the Backup Server",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via immutable offline backups and network segmentation; TRANSFER residual cost via cyber insurance" },
    incident_summary:
      "Ransomware compromised backup infrastructure, threatening recovery capability — a critical availability-and-integrity incident with potential data-breach implications.",
    severity_level: "Critical",
    failure_category: "Endpoint Security",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.DS-11, RC.RP-01", function_name: "PROTECT & RECOVER — Data Security and Incident Recovery" },
      iso_27001_2022: { control_id: "A.8.13 & A.8.7", control_name: "Information backup / Protection against malware", category: "Technological", audit_finding: "Backups were not isolated/immutable from the attack and malware defenses were insufficient (continuity A.5.29 implicated)." },
      soc_2: { criteria: "A1.2, CC7.4", name: "Availability — backup/recovery & incident response", audit_finding: "Backup/recovery and incident-response controls failed to protect recovery capability." },
      gdpr: { article: "Art. 32", name: "Security incl. availability & resilience", regulatory_risk: "Impaired ability to restore availability; if personal data was exfiltrated (double extortion), Art. 33/34 apply." },
      ccpa_cpra: { section: "1798.81.5", name: "Reasonable security procedures", regulatory_risk: "Segmentation/backup posture below 'reasonable security' if California PI is affected." },
      hipaa: { rule: "164.308(a)(7)", name: "Contingency plan", regulatory_risk: "If ePHI is involved, contingency-plan requirements and the Breach Notification Rule apply (ransomware is presumptively a breach)." },
    },
    audit_evidence_required: [
      "EDR/antivirus detections and the malware sample/hash.",
      "Backup system logs, snapshot/immutability settings and last successful restore test.",
      "Network logs showing lateral movement to the backup server; segmentation design.",
      "Incident-response and business-continuity/DR plans.",
    ],
    remediation_plan: {
      step_1_containment:
        "Isolate affected systems and the backup server, preserve forensic images, disable the intrusion's entry/persistence and rotate credentials, and locate clean offline/immutable backups before any restore.",
      step_2_leak_and_legal:
        "Determine the entry vector, dwell time and whether data was exfiltrated (double extortion); engage IR/forensics and, as appropriate, law enforcement; if personal data was breached, trigger GDPR Art. 33 (72h)/34 and applicable US state notifications.",
      step_3_permanent_fix:
        "Implement immutable, offline/air-gapped backups with tested restores (3-2-1-1), segment and harden access to backup infrastructure, deploy EDR with rapid isolation, and enforce MFA + least privilege with an exercised IR/DR runbook.",
    },
  },

  "phishing-bec": {
    incident_title: "Phishing-Driven Mailbox Takeover and Invoice Fraud (BEC)",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via phishing-resistant MFA, mail-rule monitoring and out-of-band payment verification" },
    incident_summary:
      "A finance user's Microsoft 365 credentials were harvested by a phishing page; the attacker controlled the mailbox for two days, hid replies with an inbox rule and attempted invoice-redirection fraud against a client.",
    severity_level: "High",
    failure_category: "Identity & Access Management",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.AT-01, PR.AA-03, DE.AE-02, RS.MI-01", function_name: "PROTECT, DETECT & RESPOND — Awareness, Authentication, Event Analysis and Mitigation" },
      iso_27001_2022: { control_id: "A.6.3 & A.8.5 & A.5.24", control_name: "Awareness & training / Secure authentication / Incident management planning", category: "People & Technological", audit_finding: "Awareness did not prevent credential entry, phishable authentication allowed the takeover, and it went undetected for two days." },
      soc_2: { criteria: "CC2.1, CC6.1, CC7.2", name: "Information & communication / Logical access / Anomaly monitoring", audit_finding: "Mailbox compromise and malicious inbox rules were not detected by monitoring controls." },
      gdpr: { article: "Art. 32 & Art. 33", name: "Security of processing / DPA notification", regulatory_risk: "The mailbox held client personal data; unauthorized access is a personal data breach to assess for 72-hour notification." },
      ccpa_cpra: { section: "1798.81.5 & 1798.82", name: "Reasonable security / Breach notification", regulatory_risk: "If mailbox content included California residents' PI with account or financial data, notification may be required." },
      hipaa: { rule: "N/A", name: "HIPAA Security Rule", regulatory_risk: "Not applicable unless the mailbox contained ePHI." },
    },
    audit_evidence_required: [
      "The phishing email (headers, URL) and the fake login page.",
      "Entra ID / Microsoft 365 sign-in logs showing the attacker's IPs and sessions.",
      "Unified audit log: inbox rules created, emails sent, items accessed (MailItemsAccessed).",
      "The spoofed invoice and the client's confirmation of whether payment was made.",
      "Phishing-awareness training records and the MFA/conditional-access policy.",
    ],
    remediation_plan: {
      step_1_containment:
        "Reset the password, revoke all sessions and refresh tokens, remove the malicious inbox rule and any forwarding, block the attacker's IPs/domain and phone the client not to pay the altered invoice; ask the bank to recall any transfer already made.",
      step_2_leak_and_legal:
        "Use the audit log to list every message and attachment the attacker read or sent, identify whose personal data was exposed and assess GDPR Art. 33 (72h)/34 and state notification duties; report the fraud attempt to the police and the bank.",
      step_3_permanent_fix:
        "Enforce phishing-resistant MFA with conditional access, alert on new inbox rules and impossible-travel sign-ins, enable DMARC/anti-spoofing, require out-of-band verification for any change of bank details, and run targeted phishing simulations for finance.",
    },
  },

  "vendor-breach": {
    incident_title: "Breach at a SaaS Processor Exposed Customer Data",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via supplier due diligence and contractual security clauses; TRANSFER residual liability via contract and cyber insurance" },
    incident_summary:
      "A third-party SaaS provider acting as a data processor suffered a database breach exposing our EU and US customers' records; it was onboarded with no security assessment and no breach-notification clause.",
    severity_level: "High",
    failure_category: "Third-Party Risk",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "GV.SC-04, GV.SC-06, GV.SC-07", function_name: "GOVERN — Cybersecurity Supply Chain Risk Management" },
      iso_27001_2022: { control_id: "A.5.19 & A.5.20 & A.5.22", control_name: "Supplier relationships / Security in supplier agreements / Monitoring of supplier services", category: "Organizational", audit_finding: "Supplier onboarded without a risk assessment, the agreement lacks security and breach-notification terms, and the service was never monitored." },
      soc_2: { criteria: "CC9.2, CC3.4", name: "Vendor risk management / Assessing changes in risk", audit_finding: "No vendor due diligence or ongoing monitoring operated for a processor handling confidential customer data." },
      gdpr: { article: "Art. 28 & Art. 33", name: "Processor obligations / DPA notification", regulatory_risk: "As controller we remain accountable: no Art. 28 contract terms, and the 72-hour clock starts when we become aware." },
      ccpa_cpra: { section: "1798.140(ag) & 1798.82", name: "Service provider definition / Breach notification", regulatory_risk: "Without a compliant service-provider contract the disclosure may be treated as a sale or share; affected Californians must be notified." },
      hipaa: { rule: "164.308(b)(1) & 164.314(a)", name: "Business associate contracts", regulatory_risk: "If the vendor handled ePHI, a missing business associate agreement is itself a violation." },
    },
    audit_evidence_required: [
      "The vendor's breach notice, timeline and list of affected records.",
      "The contract / DPA (or its absence) and any security schedule.",
      "Vendor onboarding and risk-assessment records (or proof none exist).",
      "Data-flow map showing which of our data the vendor processed.",
      "Our register of processing activities and processors (Art. 30).",
    ],
    remediation_plan: {
      step_1_containment:
        "Rotate any integration credentials and API keys shared with the vendor, restrict or suspend the data feed, and obtain the vendor's forensic findings and confirmation that the attacker's access is closed.",
      step_2_leak_and_legal:
        "Determine which customers and data elements were exposed; notify the lead DPA within 72h of awareness (Art. 33) and high-risk subjects (Art. 34), notify Californians under 1798.82, and record the incident in the breach register.",
      step_3_permanent_fix:
        "Introduce a third-party risk programme: tiering, security questionnaires or SOC 2 reports before onboarding, Art. 28 DPAs with breach-notification SLAs and audit rights, and periodic re-assessment of critical suppliers.",
    },
  },

  "lost-device-phi": {
    incident_title: "Stolen Unencrypted Laptop Containing Patient Records",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via full-disk encryption and MDM remote wipe; AVOID local PHI exports" },
    incident_summary:
      "A clinic laptop holding 2,300 patient records (including diagnoses and insurance numbers) was stolen; it was not encrypted and not enrolled in remote wipe — a presumptive HIPAA breach.",
    severity_level: "Critical",
    failure_category: "Data Leakage",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.DS-01, ID.AM-02", function_name: "PROTECT & IDENTIFY — Data-at-Rest Security and Asset Inventory" },
      iso_27001_2022: { control_id: "A.8.1 & A.7.9 & A.8.24", control_name: "User endpoint devices / Security of assets off-premises / Use of cryptography", category: "Technological & Physical", audit_finding: "An endpoint storing sensitive data was neither encrypted nor remotely manageable while off-premises." },
      soc_2: { criteria: "CC6.7, C1.1", name: "Protection of data on portable media / Confidentiality", audit_finding: "Confidential data stored on an unprotected portable device." },
      gdpr: { article: "Art. 9 & Art. 32 & Art. 34", name: "Special-category data / Security / Notifying data subjects", regulatory_risk: "Health data is special-category; without encryption the breach is high-risk and data subjects must be informed." },
      ccpa_cpra: { section: "1798.150", name: "Private right of action", regulatory_risk: "Theft of nonencrypted medical and insurance information exposes the organisation to statutory damages." },
      hipaa: { rule: "164.312(a)(2)(iv) & 164.404 & 164.408", name: "Encryption / Notice to individuals / Notice to the Secretary", regulatory_risk: "Encryption would have provided safe harbour; unsecured PHI requires notice to individuals within 60 days and to HHS (500+ in a state also triggers media notice)." },
    },
    audit_evidence_required: [
      "Police report and the timeline of the theft.",
      "Asset record of the laptop, its encryption status and MDM enrolment.",
      "The exported file: fields and number of patients.",
      "Policy on storing ePHI on endpoints and any approval for the export.",
      "HIPAA risk analysis covering portable devices.",
    ],
    remediation_plan: {
      step_1_containment:
        "Disable the user's accounts and cached credentials used on the laptop, revoke VPN certificates, and attempt remote lock or wipe if any agent can still reach it.",
      step_2_leak_and_legal:
        "Complete the HIPAA four-factor risk assessment; with unencrypted PHI, notify the 2,300 patients within 60 days, notify HHS and, if more than 500 residents of a state are affected, prominent media; check GDPR Art. 33/34 if any EU patients are included.",
      step_3_permanent_fix:
        "Enforce full-disk encryption and MDM (remote wipe) on every endpoint, block local exports of PHI in favour of access through the EHR, and add portable devices to the risk analysis and asset inventory.",
    },
  },

  "public-bucket": {
    incident_title: "Publicly Accessible Cloud Storage Bucket With Customer Documents",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via account-level public-access blocks and continuous configuration scanning" },
    incident_summary:
      "An S3 bucket misconfigured during a migration was publicly readable and held invoices and ID scans of California and EU customers; access logs show downloads by unknown IPs.",
    severity_level: "Critical",
    failure_category: "Cloud Misconfiguration",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.PS-01, PR.DS-01, DE.CM-09", function_name: "PROTECT & DETECT — Configuration Management, Data Security and Monitoring" },
      iso_27001_2022: { control_id: "A.8.9 & A.5.23", control_name: "Configuration management / Information security for use of cloud services", category: "Technological & Organizational", audit_finding: "A secure baseline configuration was not enforced for cloud storage and the change escaped review." },
      soc_2: { criteria: "CC6.1, CC7.1", name: "Logical access / Detection of configuration changes", audit_finding: "Public exposure of confidential data was neither prevented nor detected by configuration monitoring." },
      gdpr: { article: "Art. 32 & Art. 33 & Art. 34", name: "Security / DPA notification / Notifying data subjects", regulatory_risk: "Confirmed downloads of identity documents make this a high-risk breach requiring 72-hour DPA notice and notice to subjects." },
      ccpa_cpra: { section: "1798.150 & 1798.82", name: "Private right of action / Breach notification", regulatory_risk: "Nonencrypted ID numbers were exposed and downloaded — statutory damages and a duty to notify Californians." },
      hipaa: { rule: "N/A", name: "HIPAA Security Rule", regulatory_risk: "Not applicable — no health information indicated." },
    },
    audit_evidence_required: [
      "Bucket policy/ACL history and CloudTrail events showing when it became public.",
      "S3 server access logs listing the objects downloaded and the requesting IPs.",
      "Inventory of the objects and the personal data they contain.",
      "Migration change record and the cloud configuration baseline.",
      "The researcher's report and correspondence.",
    ],
    remediation_plan: {
      step_1_containment:
        "Enable S3 Block Public Access on the bucket and account, remove public ACLs/policies, preserve the access logs and ask the researcher to confirm their copy is deleted.",
      step_2_leak_and_legal:
        "Map exactly which objects were downloaded and by whom; notify the DPA within 72h and affected subjects (Art. 33/34), notify Californians (1798.82) and offer identity-theft protection, since ID documents were exposed.",
      step_3_permanent_fix:
        "Enforce account-wide public-access blocks via organisation policy, scan infrastructure-as-code and live accounts with CSPM, require peer-reviewed changes for storage permissions, and alert whenever a resource becomes public.",
    },
  },

  "late-notification": {
    incident_title: "Personal Data Breach Notified After the 72-Hour Deadline",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via an owned incident-response process with a breach-notification playbook" },
    incident_summary:
      "A personal data breach sat unescalated for six days and the supervisory authority was notified nine days after detection, breaching the GDPR 72-hour rule — a governance failure in incident response.",
    severity_level: "High",
    failure_category: "Governance & Compliance",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "RS.MA-01, RS.CO-02, GV.RR-02", function_name: "RESPOND & GOVERN — Incident Management, Reporting and Roles" },
      iso_27001_2022: { control_id: "A.5.24 & A.5.25 & A.5.26", control_name: "Incident management planning / Assessment of events / Response to incidents", category: "Organizational", audit_finding: "No defined owner, triage criteria or escalation timeline for personal data breaches." },
      soc_2: { criteria: "CC7.3, CC7.4", name: "Evaluating security events / Incident response", audit_finding: "The incident was not evaluated and escalated within the defined timeframe." },
      gdpr: { article: "Art. 33 & Art. 83", name: "Notification to the DPA / Administrative fines", regulatory_risk: "Late notification without reasons for the delay is an infringement in its own right, fineable up to €10m or 2% of global turnover." },
      ccpa_cpra: { section: "1798.82", name: "Breach notification", regulatory_risk: "California requires notice in the most expedient time possible and without unreasonable delay if Californians are affected." },
      hipaa: { rule: "164.404", name: "Notification to individuals", regulatory_risk: "If ePHI was involved, the 60-day outer limit for notice applies and unreasonable delay is a violation." },
    },
    audit_evidence_required: [
      "Incident ticket with detection, escalation and notification timestamps.",
      "The DPA notification and the reasons given for the delay (Art. 33(1)).",
      "Incident-response policy, playbook and RACI showing roles.",
      "Breach register entry (Art. 33(5)).",
      "On-call and escalation records for the period.",
    ],
    remediation_plan: {
      step_1_containment:
        "Send any outstanding information to the authority now with a written explanation of the delay, and confirm the breach itself is contained.",
      step_2_leak_and_legal:
        "Reassess the risk to data subjects and whether Art. 34 notice is still owed; record the root cause of the delay in the breach register and prepare for questions from the regulator.",
      step_3_permanent_fix:
        "Assign an incident owner and a DPO escalation path, adopt a breach playbook with a 24-hour internal escalation SLA and notification templates, train staff to recognise a personal data breach, and test it in tabletop exercises.",
    },
  },

  "dsar-ignored": {
    incident_title: "Data Subject Access and Erasure Requests Left Unanswered",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via a tracked request workflow with statutory deadlines" },
    incident_summary:
      "A data subject access request and a later erasure request went unanswered for three months, and California opt-out requests were never processed — a failure to honour data subject rights.",
    severity_level: "Medium",
    failure_category: "Governance & Compliance",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "GV.OC-01, GV.PO-01", function_name: "GOVERN — Organizational Context and Policy" },
      iso_27001_2022: { control_id: "A.5.34 & A.5.31", control_name: "Privacy and protection of PII / Legal, statutory, regulatory and contractual requirements", category: "Organizational", audit_finding: "No process ensured privacy requests were logged, owned and answered within the legal deadlines." },
      soc_2: { criteria: "P4.1", name: "Privacy — use, retention and disposal", audit_finding: "Privacy commitments to data subjects were not met." },
      gdpr: { article: "Art. 15-22 & Art. 5", name: "Data subject rights / Principles (accountability)", regulatory_risk: "One month to respond (extendable by two); three months of silence is an infringement and a likely complaint to the DPA." },
      ccpa_cpra: { section: "1798.105 & 1798.120 & 1798.121", name: "Right to delete / Opt-out of sale or sharing / Limit use of sensitive PI", regulatory_risk: "Requests must be answered within 45 days and opt-outs honoured within 15 business days; enforceable by the CPPA and the AG." },
      hipaa: { rule: "N/A", name: "HIPAA Privacy Rule", regulatory_risk: "Not applicable unless the requests concerned PHI." },
    },
    audit_evidence_required: [
      "The original requests with their received dates.",
      "The shared inbox or ticket history showing who saw them and when.",
      "The privacy-request procedure and response templates.",
      "Records of opt-out signals received (including Global Privacy Control) and how they were applied.",
    ],
    remediation_plan: {
      step_1_containment:
        "Answer the outstanding requests now: provide the copy of the data, complete the erasure (or explain a lawful exemption), apply every pending opt-out and apologise to the requesters.",
      step_2_leak_and_legal:
        "Search the same inbox for other unanswered requests, record the failures and be ready for a DPA or CPPA complaint; no breach notification is needed, as no data was exposed.",
      step_3_permanent_fix:
        "Create a dedicated request channel with a ticketing workflow, identity verification and automatic deadline alerts (one month GDPR / 45 days CCPA), honour opt-out preference signals, and report request metrics to management.",
    },
  },

  "missing-logs": {
    incident_title: "Intrusion Could Not Be Investigated — Logging Disabled",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via centralised logging with adequate retention and SIEM coverage" },
    incident_summary:
      "Suspicious activity on a database server could not be investigated because server logging was off, audit-log retention was 7 days and the SIEM was not ingesting the events.",
    severity_level: "High",
    failure_category: "Governance & Compliance",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "DE.CM-01, DE.CM-03, RS.AN-03", function_name: "DETECT & RESPOND — Continuous Monitoring and Incident Analysis" },
      iso_27001_2022: { control_id: "A.8.15 & A.8.16", control_name: "Logging / Monitoring activities", category: "Technological", audit_finding: "Event logs were not produced, retained or reviewed for a system holding sensitive data." },
      soc_2: { criteria: "CC7.2, CC4.1", name: "Monitoring for anomalies / Ongoing evaluations", audit_finding: "Monitoring did not cover the server, so anomalies could be neither detected nor investigated." },
      gdpr: { article: "Art. 32 & Art. 33", name: "Security / DPA notification", regulatory_risk: "Without logs a breach cannot be ruled out, so notification may have to be made on a worst-case basis." },
      ccpa_cpra: { section: "1798.81.5", name: "Reasonable security procedures", regulatory_risk: "Logging and monitoring are part of recognised 'reasonable security' baselines." },
      hipaa: { rule: "164.312(b)", name: "Audit controls", regulatory_risk: "If the database holds ePHI, audit controls that record activity are required." },
    },
    audit_evidence_required: [
      "Server and database logging configuration (before and after).",
      "SIEM source inventory showing the missing feed.",
      "The logging and retention standard.",
      "Whatever partial evidence exists: network flow logs, EDR telemetry, cloud logs.",
    ],
    remediation_plan: {
      step_1_containment:
        "Isolate or closely watch the server, enable logging immediately, take a forensic image and collect any remaining telemetry (EDR, firewall, flow logs).",
      step_2_leak_and_legal:
        "Reconstruct what is possible; if personal data could have been accessed and compromise cannot be excluded, assess Art. 33 notification on a precautionary basis and document the reasoning.",
      step_3_permanent_fix:
        "Define a logging standard (what to log, 12-month retention), forward every critical source to the SIEM with alerts for missing feeds, protect logs from tampering and review coverage quarterly.",
    },
  },

  "unpatched-vpn": {
    incident_title: "Known Critical VPN Vulnerability Exploited",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via a complete asset inventory and patch SLAs for internet-facing systems" },
    incident_summary:
      "Attackers exploited a known critical CVE on the VPN gateway; the patch had been available for six weeks but the device was missing from the asset inventory and the scanning scope.",
    severity_level: "Critical",
    failure_category: "Vulnerability Management",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "ID.AM-02, ID.RA-01, RS.MI-02", function_name: "IDENTIFY & RESPOND — Asset Inventory, Vulnerability Identification and Mitigation" },
      iso_27001_2022: { control_id: "A.8.8 & A.5.9", control_name: "Management of technical vulnerabilities / Inventory of information and other associated assets", category: "Technological & Organizational", audit_finding: "An internet-facing asset was not inventoried, so it was neither scanned nor patched within SLA." },
      soc_2: { criteria: "CC7.1, CC6.6", name: "Vulnerability detection / Boundary protection", audit_finding: "Vulnerability management did not cover a perimeter device." },
      gdpr: { article: "Art. 32", name: "Security of processing", regulatory_risk: "Leaving an available critical patch unapplied undermines 'appropriate' security; if personal data was reached, Art. 33 applies." },
      ccpa_cpra: { section: "1798.81.5", name: "Reasonable security procedures", regulatory_risk: "Timely patching of known exploited vulnerabilities is baseline reasonable security." },
      hipaa: { rule: "164.308(a)(1)(ii)(B)", name: "Risk management", regulatory_risk: "If the network carries ePHI, unmanaged known vulnerabilities breach the risk-management requirement." },
    },
    audit_evidence_required: [
      "Vendor advisory and CVE publication date versus the patch date.",
      "Asset inventory and scanner scope (showing the gap).",
      "VPN gateway logs and indicators of compromise.",
      "Patch-management policy with SLAs.",
    ],
    remediation_plan: {
      step_1_containment:
        "Patch or take the gateway offline, check the vendor's indicators of compromise, reset VPN user credentials and certificates, and hunt for lateral movement.",
      step_2_leak_and_legal:
        "Establish what the attacker did after gaining access and whether personal data was reached; notify under GDPR Art. 33 (72h) and state laws if a breach is confirmed.",
      step_3_permanent_fix:
        "Automate asset discovery, bring every internet-facing device into vulnerability scanning, set patch SLAs (e.g. 48h for known-exploited vulnerabilities), and subscribe to vendor and CISA KEV alerts.",
    },
  },

  "unapproved-change": {
    incident_title: "Unapproved Production Change Caused a Customer Outage",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via enforced change management with peer review, testing and rollback plans" },
    incident_summary:
      "A hotfix pushed directly to production without a change request, review or testing took the customer portal down for five hours with no rollback plan.",
    severity_level: "Medium",
    failure_category: "Governance & Compliance",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.PS-01, RC.RP-01", function_name: "PROTECT & RECOVER — Configuration Management and Recovery" },
      iso_27001_2022: { control_id: "A.8.32 & A.8.31", control_name: "Change management / Separation of development, test and production environments", category: "Technological", audit_finding: "The change bypassed approval and testing; developers can deploy straight to production." },
      soc_2: { criteria: "CC8.1, A1.2", name: "Change management / Availability and recovery", audit_finding: "A SOC 2 change-management exception: the change was not authorised, tested or approved before implementation." },
      gdpr: { article: "N/A", name: "—", regulatory_risk: "Not applicable unless the outage caused loss or corruption of personal data (then Art. 32 availability applies)." },
      ccpa_cpra: { section: "N/A", name: "—", regulatory_risk: "Not applicable — no personal information exposed." },
      hipaa: { rule: "N/A", name: "—", regulatory_risk: "Not applicable unless the availability of ePHI was affected." },
    },
    audit_evidence_required: [
      "Deployment log and commit showing who deployed what and when.",
      "Absence of a change ticket or approval for the deployment.",
      "Outage timeline, monitoring alerts and customer impact.",
      "Change-management policy and CI/CD branch-protection settings.",
    ],
    remediation_plan: {
      step_1_containment:
        "Roll back or fix forward through the normal pipeline, restore service and keep customers informed on the status page.",
      step_2_leak_and_legal:
        "Run a blameless post-incident review and check contractual SLAs for service credits or customer notices; no data-protection notification is expected.",
      step_3_permanent_fix:
        "Enforce branch protection and mandatory peer review, deploy only through CI/CD with automated tests, require a change record (with an emergency-change path), and keep a tested rollback for every release.",
    },
  },

  "prompt-injection": {
    incident_title: "Prompt Injection Turned the Support Agent into a Data-Exfiltration Channel",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via least-privilege tool access, adversarial-input detection and output filtering" },
    incident_summary:
      "Hidden instructions in a customer ticket hijacked the AI support agent, which used its CRM tool to read and disclose other customers' personal data — a cross-customer personal-data breach caused by an over-privileged agent.",
    severity_level: "Critical",
    failure_category: "Data Leakage",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.AA-05, PR.DS-02, DE.AE-02", function_name: "PROTECT & DETECT — Least Privilege, Data Security and Event Analysis" },
      iso_27001_2022: { control_id: "A.5.15 & A.8.12", control_name: "Access control / Data leakage prevention", category: "Organizational & Technological", audit_finding: "The agent's tool permissions ignored least privilege and nothing stopped personal data leaving through its replies." },
      soc_2: { criteria: "CC6.1, CC7.2", name: "Logical access / Anomaly monitoring", audit_finding: "No control limited the agent's data access or detected the anomalous cross-customer queries." },
      gdpr: { article: "Art. 32 & Art. 33 & Art. 34", name: "Security / DPA notification / Notifying data subjects", regulatory_risk: "Other customers' names, addresses and order history were disclosed to a third party — a notifiable breach within 72 hours." },
      ccpa_cpra: { section: "1798.82 & 1798.81.5", name: "Breach notification / Reasonable security", regulatory_risk: "Californians whose records were exposed must be notified; an unguarded agent with full read access is hard to defend as reasonable security." },
      hipaa: { rule: "N/A", name: "HIPAA Security Rule", regulatory_risk: "Not applicable — no health information indicated." },
      aiuc_1: { requirements: "B002, B006, A003, A005, A006", name: "Detect adversarial input / Prevent unauthorized AI agent actions / Limit AI agent data access / Prevent cross-customer data exposure / Prevent PII leakage", audit_finding: "Core AIUC-1 failure: the agent had unrestricted data access, no adversarial-input detection and no output safeguard against PII and cross-customer leakage — exactly what adversarial testing is meant to catch." },
    },
    audit_evidence_required: [
      "The malicious ticket and the agent's full conversation and tool-call trace.",
      "The agent's system prompt, tool definitions and the permissions of its CRM credentials.",
      "List of customer records the agent read and disclosed.",
      "Results of the latest adversarial (prompt-injection) testing of the agent.",
      "Input/output filtering configuration and monitoring alerts.",
    ],
    remediation_plan: {
      step_1_containment:
        "Disable the agent's CRM tool (or the agent) immediately, revoke and rotate its credentials, block the attacker's account and preserve the conversation and tool-call logs.",
      step_2_leak_and_legal:
        "Identify every customer whose data was disclosed; notify the DPA within 72h and affected customers (Art. 33/34) and Californians under 1798.82; record the incident under the AI failure plan for security breaches (AIUC-1 E001).",
      step_3_permanent_fix:
        "Scope the agent's tools to the requesting customer only, add prompt-injection detection and output PII filtering, require human approval for bulk lookups, and run third-party adversarial testing at least quarterly.",
    },
  },

  "agent-unauthorized-action": {
    incident_title: "Autonomous AI Coding Agent Dropped a Production Table",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via scoped agent credentials, human approval for destructive actions and full agent logging" },
    incident_summary:
      "An AI coding agent running with a human engineer's production credentials executed a destructive database command outside its task, with no approval gate and no activity log — an unauthorized agent action causing data loss.",
    severity_level: "High",
    failure_category: "Identity & Access Management",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "PR.AA-05, PR.PS-01, RC.RP-01", function_name: "PROTECT & RECOVER — Least Privilege, Configuration Management and Recovery" },
      iso_27001_2022: { control_id: "A.8.2 & A.8.32 & A.8.15", control_name: "Privileged access rights / Change management / Logging", category: "Technological", audit_finding: "The agent inherited privileged production access, changed production without change control, and left no logs." },
      soc_2: { criteria: "CC6.3, CC8.1, A1.2", name: "Least privilege / Change management / Recovery", audit_finding: "A non-human actor made an unauthorised production change; recovery depended on backups." },
      gdpr: { article: "Art. 32", name: "Security of processing (availability and integrity)", regulatory_risk: "If the table held personal data, its loss affects availability and integrity; assess Art. 33 if it cannot be restored." },
      ccpa_cpra: { section: "N/A", name: "—", regulatory_risk: "Not applicable unless California consumers' personal information was lost." },
      hipaa: { rule: "N/A", name: "—", regulatory_risk: "Not applicable — no ePHI indicated." },
      aiuc_1: { requirements: "B006, D003, E004, E015", name: "Prevent unauthorized AI agent actions / Restrict unsafe tool calls / Assign accountability / Log AI system activity", audit_finding: "The agent acted beyond its intended scope, its tool calls were not restricted, nobody had to approve destructive changes and its activity was not logged." },
    },
    audit_evidence_required: [
      "The task given to the agent and the command it executed.",
      "The credentials and permissions the agent ran with.",
      "Database audit log and backup/restore records.",
      "Agent configuration showing allowed tools and approval settings.",
      "Change-management policy and its coverage of AI agents.",
    ],
    remediation_plan: {
      step_1_containment:
        "Stop the agent, revoke the production credentials it used, restore the table from the latest backup and verify data integrity.",
      step_2_leak_and_legal:
        "Determine what data was lost between the last backup and the incident and whether personal data was affected; if it cannot be restored, assess GDPR Art. 33 and contractual SLA notices.",
      step_3_permanent_fix:
        "Give agents their own least-privilege identities (never human production credentials), block destructive tool calls without human approval, route agent changes through change management, and log every agent action and tool call.",
    },
  },

  "ai-hallucination": {
    incident_title: "Customer Chatbot Hallucinated a Refund Policy",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via grounding answers in approved policy documents, AI disclosure and a hallucination failure plan" },
    incident_summary:
      "The website chatbot invented a 90-day full-refund policy and promised it to dozens of customers, who were not told they were talking to an AI; the company had to honour the refunds — a reliability failure with direct financial loss.",
    severity_level: "Medium",
    failure_category: "Governance & Compliance",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "GV.RM-01, ID.RA-05", function_name: "GOVERN & IDENTIFY — Risk Management Objectives and Risk Prioritisation" },
      iso_27001_2022: { control_id: "A.8.29 & A.5.37", control_name: "Security testing in development and acceptance / Documented operating procedures", category: "Technological & Organizational", audit_finding: "The chatbot went live without acceptance testing of its answers and without operating procedures for incorrect output." },
      soc_2: { criteria: "CC3.2, CC4.1", name: "Risk identification / Monitoring activities", audit_finding: "The risk of incorrect customer commitments by the chatbot was not identified or monitored." },
      gdpr: { article: "N/A", name: "—", regulatory_risk: "Not applicable — no personal data exposed." },
      ccpa_cpra: { section: "N/A", name: "—", regulatory_risk: "Not applicable — no personal information exposed." },
      hipaa: { rule: "N/A", name: "—", regulatory_risk: "Not applicable — no health information involved." },
      aiuc_1: { requirements: "D001, C004, E003, E016", name: "Prevent hallucinated outputs / Prevent out-of-scope outputs / AI failure plan for hallucinations / Implement AI disclosure mechanisms", audit_finding: "No safeguard prevented hallucinated policy statements, the bot answered outside its approved scope, there was no failure plan for hallucinations causing financial loss, and users were not told they were talking to an AI." },
    },
    audit_evidence_required: [
      "Chat transcripts containing the invented policy and the number of affected customers.",
      "The official refund policy and the sources the chatbot was grounded on.",
      "Pre-deployment test results for the chatbot's answers.",
      "Cost of the honoured refunds.",
      "The chatbot's user-facing disclosure text (or its absence).",
    ],
    remediation_plan: {
      step_1_containment:
        "Restrict the chatbot to answering from approved policy documents (or hand refund questions to humans), correct the wrong statement on the site and identify all affected conversations.",
      step_2_leak_and_legal:
        "No data breach — handle as a consumer-protection and financial-loss issue: decide with legal how to honour or correct the promises and record the loss under the hallucination failure plan.",
      step_3_permanent_fix:
        "Ground answers in retrieval from approved documents with citation checks, block policy/pricing commitments outside scope, disclose clearly that users are talking to an AI, test before each release and monitor answers for hallucinations.",
    },
  },

  "shadow-ai": {
    incident_title: "Customer Data and Source Code Pasted into a Public AI Chatbot",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via an AI acceptable use policy, an approved enterprise AI tool and DLP; AVOID unvetted public AI tools" },
    incident_summary:
      "Staff pasted customer personal data and proprietary source code into a consumer generative-AI tool whose terms allow training on prompts, with no AI acceptable use policy and no vendor assessment — uncontrolled disclosure to an unvetted processor.",
    severity_level: "High",
    failure_category: "Data Leakage",
    grounded_frameworks: {
      nist_csf_2: { subcategories: "GV.PO-01, PR.AT-01, PR.DS-02", function_name: "GOVERN & PROTECT — Policy, Awareness and Data-in-Transit Security" },
      iso_27001_2022: { control_id: "A.5.10 & A.5.14 & A.5.23", control_name: "Acceptable use of information / Information transfer / Information security for use of cloud services", category: "Organizational", audit_finding: "No rule covered use of external AI services, and confidential data was transferred to an unapproved cloud service." },
      soc_2: { criteria: "CC6.7, C1.1", name: "Restrict movement of information / Confidentiality", audit_finding: "Confidential customer data and code left the organisation through an unapproved channel." },
      gdpr: { article: "Art. 28 & Art. 32 & Art. 44", name: "Processor contracts / Security / International transfers", regulatory_risk: "Personal data was disclosed to a provider with no processor agreement and possibly outside the EEA; assess it as a breach." },
      ccpa_cpra: { section: "1798.100 & 1798.140(ag)", name: "Notice and purpose limitation / Service provider", regulatory_risk: "Sharing PI with a provider that may train on it, without a service-provider contract, can count as an undisclosed sale or share." },
      hipaa: { rule: "N/A", name: "HIPAA Privacy Rule", regulatory_risk: "Not applicable unless the spreadsheets contained PHI." },
      aiuc_1: { requirements: "E010, A001, A004, E006", name: "Establish AI acceptable use policy / Establish input data policy / Protect IP & trade secrets / Conduct vendor and model due diligence", audit_finding: "No AI acceptable use or input-data policy existed, confidential IP was exposed to a model provider, and the provider was never assessed." },
    },
    audit_evidence_required: [
      "Inventory of what was pasted (data categories, number of customers, code repositories).",
      "The AI tool's terms of use and data-retention/training settings.",
      "Proxy/CASB logs showing use of AI tools across the organisation.",
      "Existing acceptable use, data classification and vendor management policies.",
    ],
    remediation_plan: {
      step_1_containment:
        "Block the public AI tool on corporate networks/devices, ask the provider to delete the conversations and opt out of training, and rotate any secrets found in the pasted code.",
      step_2_leak_and_legal:
        "Assess the disclosure as a personal-data breach (GDPR Art. 33 within 72h if risky) and check contractual confidentiality duties to customers; document the decision.",
      step_3_permanent_fix:
        "Publish an AI acceptable use policy, provide an approved enterprise AI tool with a DPA and no-training terms, add DLP for AI destinations, train staff, and run vendor due diligence on every AI provider.",
    },
  },
};

function generic(incident: string): AuditResult {
  const snippet = incident.trim().replace(/\s+/g, " ").slice(0, 160);
  return {
    incident_title: "Security / Compliance Finding",
    recommended_strategy: { strategy: "MITIGATE", rationale: "via control implementation; re-evaluate AVOID / TRANSFER / ACCEPT against your risk appetite" },
    incident_summary:
      `The reported condition was analyzed against common control objectives. "${snippet}${incident.length > 160 ? "…" : ""}" Confirm severity and scope against your environment.`,
    severity_level: "Medium" as SeverityLevel,
    failure_category: "Identity & Access Management" as FailureCategory,
    grounded_frameworks: {
      nist_csf_2: { subcategories: "ID.RA-01, PR.AA-05", function_name: "IDENTIFY & PROTECT — Risk Assessment and Access Control" },
      iso_27001_2022: { control_id: "A.5.1 & A.8.8", control_name: "Policies for information security / Management of technical vulnerabilities", category: "Organizational & Technological", audit_finding: "Assess the governing policy and remediate the underlying weakness." },
      soc_2: { criteria: "CC3.2, CC7.1", name: "Risk identification & vulnerability detection", audit_finding: "Record and analyze the risk and confirm detection coverage for this condition." },
      gdpr: { article: "Art. 32", name: "Security of processing", regulatory_risk: "Applicable if personal data of individuals in the EU is involved." },
      ccpa_cpra: { section: "1798.81.5", name: "Reasonable security procedures", regulatory_risk: "Applicable if personal information of California residents is involved." },
      hipaa: { rule: "N/A", name: "HIPAA Security Rule", regulatory_risk: "Applicable only if electronic protected health information (ePHI) is involved." },
    },
    audit_evidence_required: [
      "Relevant system, application and access logs for the affected scope.",
      "The governing policy/standard and any exception records.",
      "Tickets, change records or alerts related to the finding.",
      "Asset/data inventory identifying what is affected and who owns it.",
    ],
    remediation_plan: {
      step_1_containment:
        "Limit exposure of the affected system/data, apply a temporary control or restriction, and preserve evidence while the permanent fix is scoped.",
      step_2_leak_and_legal:
        "Determine scope and root cause and whether personal data was involved; if a reportable breach is confirmed, apply the relevant notification rule (e.g. GDPR 72h; California without unreasonable delay).",
      step_3_permanent_fix:
        "Remediate the root cause and codify the control (policy plus technical enforcement), add monitoring to detect recurrence, and review adjacent systems for the same weakness.",
    },
  };
}

export function analyzeLocally(incident: string, archetypeHint?: string): AuditResult {
  const arch =
    archetypeHint && archetypeHint in CURATED
      ? (archetypeHint as Exclude<Archetype, "generic">)
      : classify(incident);
  if (arch === "generic") return generic(incident);
  return CURATED[arch];
}
