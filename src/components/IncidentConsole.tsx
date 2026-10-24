"use client";

import type { ComponentType } from "react";
import { SCENARIOS } from "@/data/scenarios";
import {
  UserX, KeyRound, MailWarning, ShieldOff, DatabaseBackup, Fish, Handshake, Laptop, CloudOff,
  TimerOff, FileQuestion, EyeOff, Bug, GitPullRequest, Syringe, Trash2, MessageSquareWarning, Brain,
  Crown, ClipboardX, Bot, Split, ServerCrash, Landmark, CreditCard, FileLock,
  Loader2, Search,
} from "lucide-react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "user-x": UserX,
  "key-round": KeyRound,
  "mail-warning": MailWarning,
  "shield-off": ShieldOff,
  "database-backup": DatabaseBackup,
  fish: Fish,
  handshake: Handshake,
  laptop: Laptop,
  "cloud-off": CloudOff,
  "timer-off": TimerOff,
  "file-question": FileQuestion,
  "eye-off": EyeOff,
  bug: Bug,
  "git-pull-request": GitPullRequest,
  syringe: Syringe,
  trash: Trash2,
  "message-warning": MessageSquareWarning,
  brain: Brain,
  crown: Crown,
  "clipboard-x": ClipboardX,
  bot: Bot,
  split: Split,
  "server-crash": ServerCrash,
  landmark: Landmark,
  "credit-card": CreditCard,
  "file-lock": FileLock,
};

const MAX = 4000;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPick: (description: string, archetype: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export default function IncidentConsole({ value, onChange, onPick, onSubmit, loading }: Props) {
  const tooShort = value.trim().length < 15;
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <label className="text-sm font-semibold text-slate-200">
        Choose an incident to test — or describe your own
      </label>

      {/* Quick-test scenario pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => {
          const Icon = ICONS[s.icon] ?? Search;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.description, s.archetype)}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1.5 text-xs text-slate-300 transition hover:border-accent/50 hover:text-white"
            >
              <Icon className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium">{s.title}</span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{s.badge}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX}
        rows={6}
        placeholder="e.g. During a quarterly access review we found a terminated employee still had an active login in Google Workspace and the CRM three months after leaving…"
        className="mt-3 w-full resize-y rounded-xl border border-line bg-ink p-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-accent/60"
      />

      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs ${value.length > MAX - 100 ? "text-amber-400" : "text-slate-500"}`}>
          {value.length}/{MAX}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || tooShort}
          className="inline-flex items-center gap-2 rounded-full bg-accent-strong px-6 py-2.5 text-sm font-bold text-gray-900 transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Auditing…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Audit Incident
            </>
          )}
        </button>
      </div>
    </div>
  );
}
