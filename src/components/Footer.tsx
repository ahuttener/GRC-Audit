// Same footer on every GRC Audit page: credit, scope note and the official social links.
export default function Footer() {
  return (
    <footer className="mt-10 border-t border-line py-6 text-center text-xs text-slate-500">
      GRC Audit · built by{" "}
      <a href="https://cybersecinfo.com" className="text-accent hover:underline">
        CyberSecInfo
      </a>{" "}
      · grounded against embedded NIST, ISO 27001, SOC 2, GDPR, CCPA/CPRA, HIPAA, AIUC-1 &amp; DORA catalogs ·
      automated output is an indicator, not legal advice.
      <p className="mx-auto mt-2 max-w-3xl px-4">
        Privacy: each analysis adds anonymous, text-free statistics (severity, category and cited control IDs) to the
        public GRC Indicators — never the incident text, and no IP addresses or cookies.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
        <a href="https://www.instagram.com/cyber_secinfo/" target="_blank" rel="noopener noreferrer" aria-label="CyberSecInfo on Instagram" className="inline-flex items-center gap-2 text-slate-300 hover:text-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJnIiBjeD0iMzAlIiBjeT0iMTA3JSIgcj0iMTUwJSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRmNDk3Ii8+PHN0b3Agb2Zmc2V0PSIuMDUiIHN0b3AtY29sb3I9IiNmZGY0OTciLz48c3RvcCBvZmZzZXQ9Ii40NSIgc3RvcC1jb2xvcj0iI2ZkNTk0OSIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiNkNjI0OWYiLz48c3RvcCBvZmZzZXQ9Ii45IiBzdG9wLWNvbG9yPSIjMjg1QUVCIi8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNiIgZmlsbD0idXJsKCNnKSIvPjxyZWN0IHg9IjUiIHk9IjUiIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgcng9IjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjgiLz48Y2lyY2xlIGN4PSIxNi4zIiBjeT0iNy43IiByPSIxLjA1IiBmaWxsPSIjZmZmIi8+PC9zdmc+" width={20} height={20} alt="" aria-hidden="true" />
          @cyber_secinfo
        </a>
        <a href="https://github.com/ahuttener" target="_blank" rel="noopener noreferrer" aria-label="Adriano Huttener on GitHub" className="inline-flex items-center gap-2 text-slate-300 hover:text-accent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2YyZjVmYyIgZD0iTTEyIC4yOTdjLTYuNjMgMC0xMiA1LjM3My0xMiAxMiAwIDUuMzAzIDMuNDM4IDkuOCA4LjIwNSAxMS4zODUuNi4xMTMuODItLjI1OC44Mi0uNTc3IDAtLjI4NS0uMDEtMS4wNC0uMDE1LTIuMDQtMy4zMzguNzI0LTQuMDQyLTEuNjEtNC4wNDItMS42MUM0LjQyMiAxOC4wNyAzLjYzMyAxNy43IDMuNjMzIDE3LjdjLTEuMDg3LS43NDQuMDg0LS43MjkuMDg0LS43MjkgMS4yMDUuMDg0IDEuODM4IDEuMjM2IDEuODM4IDEuMjM2IDEuMDcgMS44MzUgMi44MDkgMS4zMDUgMy40OTUuOTk4LjEwOC0uNzc2LjQxNy0xLjMwNS43Ni0xLjYwNS0yLjY2NS0uMy01LjQ2Ni0xLjMzMi01LjQ2Ni01LjkzIDAtMS4zMS40NjUtMi4zOCAxLjIzNS0zLjIyLS4xMzUtLjMwMy0uNTQtMS41MjMuMTA1LTMuMTc2IDAgMCAxLjAwNS0uMzIyIDMuMyAxLjIzLjk2LS4yNjcgMS45OC0uMzk5IDMtLjQwNSAxLjAyLjAwNiAyLjA0LjEzOCAzIC40MDUgMi4yOC0xLjU1MiAzLjI4NS0xLjIzIDMuMjg1LTEuMjMuNjQ1IDEuNjUzLjI0IDIuODczLjEyIDMuMTc2Ljc2NS44NCAxLjIzIDEuOTEgMS4yMyAzLjIyIDAgNC42MS0yLjgwNSA1LjYyNS01LjQ3NSA1LjkyLjQyLjM2LjgxIDEuMDk2LjgxIDIuMjIgMCAxLjYwNi0uMDE1IDIuODk2LS4wMTUgMy4yODYgMCAuMzE1LjIxLjY5LjgyNS41N0MyMC41NjUgMjIuMDkyIDI0IDE3LjU5MiAyNCAxMi4yOTdjMC02LjYyNy01LjM3My0xMi0xMi0xMiIvPjwvc3ZnPg==" width={20} height={20} alt="" aria-hidden="true" />
          ahuttener
        </a>
      </div>
      <p className="mt-3">&copy; 2026 CyberSecInfo. All rights reserved.</p>
    </footer>
  );
}
