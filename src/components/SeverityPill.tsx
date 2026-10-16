import type { SeverityLevel } from "@/types/grc";

const MAP: Record<SeverityLevel, string> = {
  Critical: "bg-red-500 text-white ring-red-300/40",
  High: "bg-orange-500 text-white ring-orange-300/40",
  Medium: "bg-yellow-400 text-black ring-yellow-200/50",
  Low: "bg-emerald-500 text-white ring-emerald-300/40",
};

export default function SeverityPill({ level }: { level: SeverityLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ring-2 ${MAP[level]}`}
    >
      {level}
    </span>
  );
}
