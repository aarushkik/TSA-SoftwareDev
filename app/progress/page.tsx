"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import CountUpNumber from "@/components/CountUpNumber";
import { scoreColor } from "@/components/MetricBar";
import PracticeHeatmap from "@/components/PracticeHeatmap";
import ScoreTrendChart from "@/components/ScoreTrendChart";
import { ACHIEVEMENTS, currentStreakDays, unlockedAchievements } from "@/lib/achievements";
import {
  clearSessions,
  deleteSession,
  getSessions,
  getSessionsServerSnapshot,
  importSessions,
  isSessionRecord,
  subscribeSessions,
} from "@/lib/sessions";
import { JOB_TYPE_LABELS } from "@/lib/types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export default function ProgressPage() {
  const sessions = useSyncExternalStore(subscribeSessions, getSessions, getSessionsServerSnapshot);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-coach-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    file
      .text()
      .then((text) => {
        const parsed: unknown = JSON.parse(text);
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        const valid = candidates.filter(isSessionRecord);
        if (valid.length === 0) {
          setImportMessage("That file didn't contain any recognizable sessions.");
          return;
        }
        const added = importSessions(valid);
        setImportMessage(
          added === 0 ? "Those sessions were already in your history." : `Imported ${added} session${added === 1 ? "" : "s"}.`,
        );
      })
      .catch(() => setImportMessage("Couldn't read that file — make sure it's a session export from this app."))
      .finally(() => setTimeout(() => setImportMessage(null), 4000));
  }

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
  const streak = currentStreakDays(sessions);
  const unlocked = new Set(unlockedAchievements(sessions).map((a) => a.id));

  return (
    <main className="mx-auto max-w-2xl flex-1 animate-fade-in px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Your progress</h1>

      {sessions.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm font-medium text-slate-500">No sessions yet</p>
          <p className="mt-1 text-xs text-slate-400">Complete a practice session to start tracking your progress here.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className={`text-2xl font-bold tabular-nums ${scoreColor(avgScore)}`}>
                <CountUpNumber value={avgScore} />
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Avg. score</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xl font-bold tabular-nums text-slate-800">
                <CountUpNumber value={streak} />
                {streak > 0 && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-500" aria-hidden>
                    <path d="M12 2c-1.5 3-4 4.5-4 8a4 4 0 008 0c0-1.2-.5-2-1-2.7.2 1.5-.6 2.2-1.3 2.2-1 0-1.2-1-.7-1.8.9-1.4.9-3.2-1-5.7z" strokeLinejoin="round" />
                  </svg>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Day streak</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-slate-800">
                <CountUpNumber value={avgWpm} />
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Avg. words/min</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-slate-800">
                <CountUpNumber value={avgFillers} />
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Avg. fillers/session</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Practice activity</p>
            <div className="mt-3">
              <PracticeHeatmap sessions={sessions} />
            </div>
          </div>

          {chronological.length >= 2 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <ScoreTrendChart scores={chronological.map((s) => s.overallScore)} />
              {trend !== null && (
                <p className="mt-1 text-center text-xs text-slate-500">
                  {trend > 0
                    ? `Trending up ${trend} points from your earliest to most recent session.`
                    : trend < 0
                      ? `Dipped ${Math.abs(trend)} points recently — a rough session or two is normal.`
                      : "Holding steady across your sessions."}
                </p>
              )}
            </div>
          )}

          <p className="mt-5 text-xs font-medium text-slate-500">
            Achievements <span className="font-normal text-slate-400">({unlocked.size}/{ACHIEVEMENTS.length})</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = unlocked.has(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`rounded-xl border p-3 transition ${
                    isUnlocked ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill={isUnlocked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className={isUnlocked ? "shrink-0 text-teal-600" : "shrink-0 text-slate-400"}
                      aria-hidden
                    >
                      <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" strokeLinejoin="round" />
                    </svg>
                    <p className={`text-xs font-semibold ${isUnlocked ? "text-teal-900" : "text-slate-600"}`}>{achievement.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{achievement.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Session history</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleExport} className="text-[11px] font-medium text-slate-400 hover:text-slate-700">
                Export
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-700"
              >
                Import
              </button>
              <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
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
          </div>
          {importMessage && <p className="mt-1.5 text-[11px] text-teal-700">{importMessage}</p>}

          <ul className="mt-2 space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300"
              >
                <Link href={`/progress/${s.id}`} className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{JOB_TYPE_LABELS[s.jobType]}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(s.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {s.answers.length} question{s.answers.length === 1 ? "" : "s"}
                  </p>
                  {s.notes && <p className="mt-0.5 truncate text-xs italic text-slate-400">&ldquo;{s.notes}&rdquo;</p>}
                </Link>
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
