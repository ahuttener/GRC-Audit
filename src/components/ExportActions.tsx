"use client";

import { useState } from "react";
import { Copy, Download, Check, FileText } from "lucide-react";
import type { AuditResponse } from "@/types/grc";
import { toMarkdown } from "@/lib/toMarkdown";
import { toReportHtml } from "@/lib/toReportHtml";
import { emblemUrl, printHtml } from "@/lib/printHtml";

export default function ExportActions({ resp }: { resp: AuditResponse }) {
  const [copied, setCopied] = useState(false);
  const md = toMarkdown(resp);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grc-audit-${resp.result.failure_category.replace(/\W+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Print-ready report with the CyberSecInfo emblem; the print dialog saves it as a PDF.
  const printReport = () => printHtml(toReportHtml(resp, emblemUrl()));

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-accent/50 hover:text-white"
      >
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy full audit report"}
      </button>
      <button
        onClick={download}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-accent/50 hover:text-white"
      >
        <Download className="h-4 w-4" />
        Export to Markdown
      </button>
      <button
        onClick={printReport}
        className="inline-flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent-strong hover:text-gray-900"
      >
        <FileText className="h-4 w-4" />
        Download PDF report
      </button>
    </div>
  );
}
