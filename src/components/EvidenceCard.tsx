import { FileText } from "lucide-react";

export default function EvidenceCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <FileText className="h-4 w-4 text-accent" />
        Audit evidence the assessor will request
      </h3>
      <ul className="space-y-2">
        {items.map((e, i) => (
          <li key={i} className="flex gap-2 text-sm text-slate-300">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{e}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
