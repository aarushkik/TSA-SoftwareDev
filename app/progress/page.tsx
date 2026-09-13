"use client";

import { useSyncExternalStore } from "react";
import { scoreColor } from "@/components/MetricBar";
import { clearSessions, deleteSession, getSessions, getSessionsServerSnapshot, subscribeSessions } from "@/lib/sessions";
import { JOB_TYPE_LABELS } from "@/lib/types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export default function ProgressPage() {
  const sessions = useSyncExternalStore(subscribeSessions, getSessions, getSessionsServerSnapshot);

  const avgScore = average(sessions.map((s) => s.overallScore));
  const avgWpm = average(
    sessions.flatMap((s) => s.answers.map((a) => a.analysis.wordsPerMinute)),
  );
  const avgFillers = average(sessions.map((s) => s.answers.reduce((sum, a) => sum + a.analysis.fillerWordCount, 0)));

  // Oldest-first, so the trend reads left-to-right chronologically.
  const chronological = [...sessions].reverse();
  const firstHalf = chronological.slice(0, Math.ceil(chronological.length / 2));
  const secondHalf = chronological.slice(Math.ceil(chronological.length / 2));
  const trend =
    chronological.length >= 2 ? average(secondHalf.map((s) => s.overallScore)) - average(firstHalf.map((s) => s.overallScore)) : null;

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Your progress</h1>

      {sessions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm font-medium text-slate-500">No sessions yet</p>
          <p className="mt-1 text-xs text-slate-400">Complete a practice session to start tracking your progress here.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className={`text-2xl font-bold tabular-nums ${scoreColor(avgScore)}`}>{avgScore}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Avg. score</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-slate-800">{avgWpm}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Avg. words/min</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-slate-800">{avgFillers}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Avg. fillers/session</p>
            </div>
          </div>

          {trend !== null && (
            <p className="mt-3 text-center text-xs text-slate-500">
              {trend > 0
                ? `Your scores have trended up ${trend} points from your earliest to most recent sessions.`
                : trend < 0
                  ? `Your scores have dipped ${Math.abs(trend)} points recently — a rough session or two is normal.`
                  : "Your scores have stayed steady across sessions."}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Session history</p>
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear all saved sessions? This can't be undone.")) clearSessions();
              }}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-600"
            >
              Clear all
            </button>
          </div>

          <ul className="mt-2 space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{JOB_TYPE_LABELS[s.jobType]}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(s.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {s.answers.length} question{s.answers.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`text-lg font-semibold tabular-nums ${scoreColor(s.overallScore)}`}>{s.overallScore}</span>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    aria-label="Delete session"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
