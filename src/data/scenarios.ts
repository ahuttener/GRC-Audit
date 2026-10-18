// Pre-configured quick-test scenarios. Clicking a pill loads its `description`
// into the textarea. `archetype` lets the demo engine return a curated analysis.

export interface Scenario {
  id: string;
  title: string;
  badge: string;
  /** lucide-react icon name, mapped in the UI. */
  icon:
    | "user-x" | "key-round" | "mail-warning" | "shield-off" | "database-backup" | "fish"
    | "handshake" | "laptop" | "cloud-off" | "timer-off" | "file-question" | "eye-off"
    | "bug" | "git-pull-request" | "syringe" | "trash" | "message-warning" | "brain"
    | "crown" | "clipboard-x" | "bot" | "split" | "server-crash";
  archetype:
    | "zombie-account" | "secret-exposure" | "data-leak" | "missing-mfa" | "ransomware"
    | "phishing-bec" | "vendor-breach" | "lost-device-phi" | "public-bucket"
    | "late-notification" | "dsar-ignored" | "missing-logs" | "unpatched-vpn"
    | "unapproved-change" | "prompt-injection" | "agent-unauthorized-action" | "ai-hallucination"
    | "shadow-ai" | "privileged-access" | "access-review-failure" | "non-human-identity"
    | "sod-conflict" | "backup-dr-failure";
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "zombie-account",
    title: "Zombie Account",
    badge: "Access Control",
    icon: "user-x",
    archetype: "zombie-account",
    description:
      "During a routine quarterly user access review audit, the internal security team discovered that an employee terminated 3 months ago still had an active login and valid credentials in the corporate Google Workspace and internal CRM. An auditor flagged this as an unrevoked orphan account.",
  },
  {
    id: "secret-exposure",
    title: "Public API Key & Secret Exposure",
    badge: "Cloud Security",
    icon: "key-round",
    archetype: "secret-exposure",
    description:
      "A software developer accidentally committed production database credentials and an AWS root secret key to a public GitHub repository. The commit was live for 48 hours before automated scanners flagged it.",
  },
  {
    id: "data-leak",
    title: "Customer Data Leak via Unencrypted Channel",
    badge: "Data Privacy",
    icon: "mail-warning",
    archetype: "data-leak",
    description:
      "A customer support agent downloaded an unencrypted spreadsheet containing 5,000 EU and California customer names, emails, and credit card expiration dates, and emailed it to their personal external inbox to work from home.",
  },
  {
    id: "missing-mfa",
    title: "Missing MFA on Cloud Infrastructure",
    badge: "Identity & Access",
    icon: "shield-off",
    archetype: "missing-mfa",
    description:
      "An internal audit revealed that 12 engineering accounts with administrative access to production AWS environments were not configured with Multi-Factor Authentication (MFA).",
  },
  {
    id: "ransomware",
    title: "Ransomware Reached the Backup Server",
    badge: "Resilience",
    icon: "database-backup",
    archetype: "ransomware",
    description:
      "Ransomware spread from a compromised workstation to the file servers and then to the backup server, which was joined to the same domain. The attackers encrypted the backups and are demanding a ransom; the last offline copy is three weeks old.",
  },
  {
    id: "phishing-bec",
    title: "Phishing Led to Mailbox Takeover",
    badge: "Social Engineering",
    icon: "fish",
    archetype: "phishing-bec",
    description:
      "A finance employee entered their Microsoft 365 password on a fake login page sent in a phishing email. The attacker used the mailbox for two days, created an inbox rule to hide replies, and sent a spoofed invoice asking a client to change the bank details for a wire transfer.",
  },
  {
    id: "vendor-breach",
    title: "Vendor (SaaS Processor) Breach Exposed Our Customers",
    badge: "Supply Chain",
    icon: "handshake",
    archetype: "vendor-breach",
    description:
      "Our third-party SaaS provider, which processes our customers' support tickets as a data processor, informed us that an attacker accessed its database. Records of our EU and US customers were exposed. The vendor was onboarded without a security assessment and the contract has no breach-notification clause.",
  },
  {
    id: "lost-device-phi",
    title: "Stolen Laptop With Patient Records",
    badge: "Healthcare",
    icon: "laptop",
    archetype: "lost-device-phi",
    description:
      "A clinic laptop was stolen from a clinician's car. It held an export of 2,300 patient records (names, dates of birth, diagnoses and insurance numbers) — ePHI on a device without full-disk encryption and not enrolled in remote wipe.",
  },
  {
    id: "public-bucket",
    title: "Public Cloud Storage Bucket",
    badge: "Cloud Security",
    icon: "cloud-off",
    archetype: "public-bucket",
    description:
      "A security researcher reported that one of our AWS S3 buckets was publicly accessible. It was misconfigured during a migration and contained invoices and ID document scans of California and EU customers; access logs show downloads from unknown IP addresses.",
  },
  {
    id: "late-notification",
    title: "Breach Notified After the 72-Hour Deadline",
    badge: "Incident Response",
    icon: "timer-off",
    archetype: "late-notification",
    description:
      "A personal data breach was detected on a Friday but only escalated to the DPO the following Thursday. The supervisory authority was notified 9 days after detection, well past the 72-hour deadline, because no one owned the incident response process.",
  },
  {
    id: "dsar-ignored",
    title: "Data Subject Request Ignored",
    badge: "Privacy Rights",
    icon: "file-question",
    archetype: "dsar-ignored",
    description:
      "A customer submitted a data subject access request asking for a copy of their personal data and later a right-to-erasure request. Both requests sat unanswered in a shared inbox for 3 months; California customers' opt-out (do not sell or share) requests were also never processed.",
  },
  {
    id: "missing-logs",
    title: "No Logs to Investigate an Intrusion",
    badge: "Detection & Monitoring",
    icon: "eye-off",
    archetype: "missing-logs",
    description:
      "After suspicious activity on a database server, the team could not determine what happened: logging was disabled on the server, audit log retention was only 7 days, and the SIEM was not receiving its events.",
  },
  {
    id: "unpatched-vpn",
    title: "Unpatched VPN Exploited",
    badge: "Vulnerability Mgmt",
    icon: "bug",
    archetype: "unpatched-vpn",
    description:
      "Attackers exploited a known critical CVE in our VPN gateway. The vendor patch had been available for 6 weeks but was never applied because the device was missing from the asset inventory and outside the vulnerability scanning scope.",
  },
  {
    id: "unapproved-change",
    title: "Unapproved Production Change Caused an Outage",
    badge: "Change Mgmt",
    icon: "git-pull-request",
    archetype: "unapproved-change",
    description:
      "An engineer deployed a hotfix directly to production without a change request, peer review or testing. It caused a 5-hour outage of the customer portal and there was no rollback plan.",
  },
  {
    id: "prompt-injection",
    title: "Prompt Injection Made the AI Agent Leak Data",
    badge: "AI Agent Security",
    icon: "syringe",
    archetype: "prompt-injection",
    description:
      "Our AI customer-support agent read a support ticket that contained hidden prompt injection instructions. Following them, the agent used its CRM tool to look up other customers' orders and replied with their names, addresses and order history. The agent had read access to every customer record and no filter for adversarial input.",
  },
  {
    id: "agent-unauthorized-action",
    title: "AI Coding Agent Deleted Production Data",
    badge: "Agentic AI",
    icon: "trash",
    archetype: "agent-unauthorized-action",
    description:
      "An autonomous AI coding agent was asked to clean up test data. Running with an engineer's production credentials and without human approval for destructive commands, the agent dropped a production database table. Agent activity was not logged, so reconstructing its tool calls took two days.",
  },
  {
    id: "ai-hallucination",
    title: "Chatbot Invented a Refund Policy",
    badge: "AI Reliability",
    icon: "message-warning",
    archetype: "ai-hallucination",
    description:
      "Our website chatbot, built on an LLM, hallucinated a refund policy that does not exist and promised dozens of customers full refunds after 90 days. Customers were not told they were talking to an AI, and there was no plan for handling chatbot hallucinations; the company had to honour the refunds.",
  },
  {
    id: "shadow-ai",
    title: "Staff Pasted Customer Data into a Public AI Tool",
    badge: "Shadow AI",
    icon: "brain",
    archetype: "shadow-ai",
    description:
      "Employees pasted customer spreadsheets with personal data and proprietary source code into a free public generative AI chatbot whose terms allow prompts to be used for model training. There is no AI acceptable use policy, and the AI vendor was never assessed.",
  },
  // Identity governance scenarios — drawn from the companion Identity Governance Audit
  // Framework (controls IAM-06, IAM-08, IAM-09 and IAM-10).
  {
    id: "privileged-access",
    title: "Standing Admin Rights & Uncontrolled Break-Glass",
    badge: "Identity Governance",
    icon: "crown",
    archetype: "privileged-access",
    description:
      "A cloud engineer held standing global admin rights in the production AWS organisation instead of just-in-time elevation. The break-glass account had been used twice with no alert or post-use review, its password was never rotated, and the engineer approved their own elevation requests.",
  },
  {
    id: "access-review-failure",
    title: "Rubber-Stamped Quarterly Access Review",
    badge: "Identity Governance",
    icon: "clipboard-x",
    archetype: "access-review-failure",
    description:
      "The Q3 user access review for five critical systems was finished 11 days late. The AWS production user listing was a manually compiled spreadsheet with no source query or extraction date, so its completeness could not be validated, and one system owner certified their own access and rubber-stamped every user without changes.",
  },
  {
    id: "non-human-identity",
    title: "Ownerless Service Account with a Never-Rotated Token",
    badge: "Identity Governance",
    icon: "bot",
    archetype: "non-human-identity",
    description:
      "A security review found a service account used by the nightly billing integration with no registered owner. Its API token had never been rotated in four years, the non-human identity still allowed interactive login, and it held write access to the production database. Nobody could say which team still needed it.",
  },
  {
    id: "sod-conflict",
    title: "Segregation of Duties Conflict after a Role Change",
    badge: "Identity Governance",
    icon: "split",
    archetype: "sod-conflict",
    description:
      "An accounts payable clerk transferred to the treasury team kept their old ERP role after the role change. The combined access let them create a new payee and approve payments to it — a segregation of duties conflict (toxic combination) that went unnoticed for five months.",
  },
  {
    id: "backup-dr-failure",
    title: "Silent Backup Failure & Untested Disaster Recovery",
    badge: "Business Continuity",
    icon: "server-crash",
    archetype: "backup-dr-failure",
    description:
      "During a power failure at its data centre, a payroll provider found that its database backups had not completed for six weeks because the backup storage was full and no alert was configured. The disaster recovery plan had never been tested and had no RTO or RPO targets, so payroll ran three days late while engineers rebuilt the database from older copies.",
  },
];
