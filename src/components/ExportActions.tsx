"use client";

import { useState } from "react";
import { Copy, Download, Check, FileText } from "lucide-react";
import type { AuditResponse } from "@/types/grc";
import { toMarkdown } from "@/lib/toMarkdown";
import { toReportHtml } from "@/lib/toReportHtml";

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
  // A hidden iframe avoids pop-up blockers and keeps the user on the page.
  const printReport = () => {
    const logo = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/emblem.png`;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(toReportHtml(resp, logo));
    doc.close();
    const go = () => {
      win.focus();
      win.print();
      setTimeout(() => frame.remove(), 1000);
    };
    const img = doc.images[0];
    if (img && !img.complete) {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
    } else {
      go();
    }
  };

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
