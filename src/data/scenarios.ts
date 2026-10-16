// Pre-configured quick-test scenarios. Clicking a pill loads its `description`
// into the textarea. `archetype` lets the demo engine return a curated analysis.

export interface Scenario {
  id: string;
  title: string;
  badge: string;
  /** lucide-react icon name, mapped in the UI. */
  icon: "user-x" | "key-round" | "mail-warning" | "shield-off";
  archetype: "zombie-account" | "secret-exposure" | "data-leak" | "missing-mfa";
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
];
