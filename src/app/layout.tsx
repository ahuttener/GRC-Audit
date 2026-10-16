import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRC Audit — Incident-to-Framework Diagnostic",
  description:
    "Describe a security incident in plain language and get multi-framework control mapping, severity, audit evidence and a 3-step remediation roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
