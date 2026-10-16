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
  | "generic";

const KEYWORDS: Record<Exclude<Archetype, "generic">, string[]> = {
  "zombie-account": ["terminated", "orphan", "offboard", "deprovision", "access review",
    "former employee", "leaver", "still had", "active login", "unrevoked", "dormant"],
  "secret-exposure": ["api key", "secret key", "secret", "credentials", "committed", "github",
    "repository", "repo", "aws root", "root secret", "hardcoded", "exposed key", "access key"],
  "data-leak": ["spreadsheet", "personal inbox", "emailed", "exfiltrat", "leak", "unencrypted",
    "downloaded", "external inbox", "forwarded", "personal email", "customer data"],
  "missing-mfa": ["mfa", "multi-factor", "multi factor", "2fa", "two-factor", "without mfa",
    "no mfa", "not configured with"],
  ransomware: ["ransom", "ransomware", "encrypted the", "malware", "backup server", "locked out",
    "extortion"],
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
};

function generic(incident: string): AuditResult {
  const snippet = incident.trim().replace(/\s+/g, " ").slice(0, 160);
  return {
    incident_title: "Security / Compliance Finding",
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
