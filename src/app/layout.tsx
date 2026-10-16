import type { Metadata } from "next";
import "./globals.css";

const SITE = "https://cybersecinfo.com/grcaudit/";
const DESCRIPTION =
  "Describe a security incident in plain language and get a grounded multi-framework mapping (NIST CSF 2.0, ISO 27001, SOC 2, GDPR, CCPA/CPRA, HIPAA), audit evidence and a 3-step remediation roadmap.";

export const metadata: Metadata = {
  title: "GRC Audit | CyberSecInfo",
  description: DESCRIPTION,
  openGraph: {
    title: "GRC Audit — Governance, Risk and Compliance | CyberSecInfo",
    description: DESCRIPTION,
    url: SITE,
    siteName: "CyberSecInfo",
    type: "website",
    images: [{ url: `${SITE}banner.jpg`, width: 1600, height: 640, alt: "GRC — Governance, Risk and Compliance" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GRC Audit | CyberSecInfo",
    description: DESCRIPTION,
    images: [`${SITE}banner.jpg`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same typefaces as cybersecinfo.com: Orbitron (display) + Roboto (body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
