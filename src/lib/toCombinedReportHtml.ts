import type { AuditResponse } from "@/types/grc";
import type { Indicators } from "@/types/indicators";
import { esc, toReportHtml } from "@/lib/toReportHtml";
import { toIndicatorsReportHtml } from "@/lib/toIndicatorsReportHtml";

// Every field inside both reports is escaped, so these tags only ever match the templates' own.
const part = (html: string, tag: "style" | "body") =>
  html.match(new RegExp(`<${tag}>([\\s\\S]*)</${tag}>`))?.[1] ?? "";

/**
 * One print-ready PDF: the incident audit report first, then the Key Risk Indicator report on a
 * new page — the incident and the risk picture it now belongs to, in a single document.
 */
export function toCombinedReportHtml(
  resp: AuditResponse,
  d: Indicators,
  opts: { logoUrl: string; datasetLabel: string; generatedAt?: Date },
): string {
  const incident = toReportHtml(resp, opts.logoUrl, opts.generatedAt);
  const kri = toIndicatorsReportHtml(d, opts);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Complete GRC Report — ${esc(resp.result.incident_title)}</title>
<style>
${part(incident, "style")}
${part(kri, "style")}
  .next-report { break-before: page; page-break-before: always; }
</style>
</head>
<body>
<section>${part(incident, "body")}</section>
<section class="next-report">${part(kri, "body")}</section>
</body>
</html>`;
}
