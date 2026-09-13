"use client";

import Link from "next/link";
import { useState } from "react";
import CountUpNumber from "./CountUpNumber";
import { scoreColor } from "./MetricBar";
import { METRIC_TIPS } from "@/lib/analysis";
import { updateSessionNotes } from "@/lib/sessions";
import {
  DIFFICULTY_LABELS,
  JOB_TYPE_LABELS,
  METRIC_LABELS,
  type AnsweredQuestion,
  type Difficulty,
  type JobType,
  type Metric,
} from "@/lib/types";

function recommendedDifficulty(score: number): Difficulty {
  if (score >= 80) return "advanced";
  if (score < 50) return "beginner";
  return "intermediate";
}

function sessionEncouragement(score: number): string {
  if (score >= 85) return "Excellent session — you're building real momentum.";
  if (score >= 65) return "Nice work — solid progress this session.";
  return "Session complete — every rep like this helps.";
}

function averageByMetric(answers: AnsweredQuestion[]): { key: Metric["key"]; label: string; average: number }[] {
  const totals = new Map<Metric["key"], { sum: number; count: number }>();
  for (const { analysis } of answers) {
    for (const m of analysis.metrics) {
      if (!m.available) continue;
      const entry = totals.get(m.key) ?? { sum: 0, count: 0 };
      entry.sum += m.score;
      entry.count += 1;
      totals.set(m.key, entry);
    }
  }
  return Array.from(totals.entries()).map(([key, { sum, count }]) => ({
    key,
    label: METRIC_LABELS[key],
    average: Math.round(sum / count),
  }));
}

function buildSummaryText(
  jobType: JobType,
  answers: AnsweredQuestion[],
  overallScore: number,
  averages: { label: string; average: number }[],
): string {
  const lines = [
    "Interview Coach — Practice Session Summary",
    `${JOB_TYPE_LABELS[jobType]} · ${answers.length} question${answers.length === 1 ? "" : "s"} · Overall score: ${overallScore}/100`,
    "",
    ...averages.map((m) => `${m.label}: ${m.average}/100`),
  ];
  return lines.join("\n");
}

export default function SessionSummary({
  jobType,
  answers,
  overallScore,
  sessionId,
  onPracticeAgain,
}: {
  jobType: JobType;
  answers: AnsweredQuestion[];
  overallScore: number;
  sessionId: string | null;
  onPracticeAgain: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const averages = averageByMetric(answers).sort((a, b) => b.average - a.average);
  const strengths = averages.filter((m) => m.average >= 78);
  const focusAreas = averages.filter((m) => m.average < 65);
  const weakest = averages[averages.length - 1];
  const totalFillers = answers.reduce((sum, a) => sum + a.analysis.fillerWordCount, 0);
  const avgWpm = Math.round(
    answers.reduce((sum, a) => sum + a.analysis.wordsPerMinute, 0) / Math.max(1, answers.length),
  );

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  function handleShare() {
    const text = buildSummaryText(jobType, answers, overallScore, averages);
    navigator.share({ title: "Interview Coach — Practice Session Summary", text }).catch(() => {
      // The user cancelled the share sheet, or the platform rejected it — nothing to do.
    });
  }

  function handleCopySummary() {
    const text = buildSummaryText(jobType, answers, overallScore, averages);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSaveNotes() {
    if (!sessionId) return;
    updateSessionNotes(sessionId, notes);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 text-center">
        <p className="text-xs font-medium text-slate-500">{sessionEncouragement(overallScore)}</p>
        <p className={`mt-1 text-4xl font-bold tabular-nums ${scoreColor(overallScore)}`}>
          <CountUpNumber value={overallScore} />
        </p>
        <p className="text-xs text-slate-400">out of 100 · {answers.length} question{answers.length === 1 ? "" : "s"}</p>
        <div className="mt-4 flex justify-center gap-6 text-xs text-slate-500">
          <span>{avgWpm} avg. words/min</span>
          <span>{totalFillers} filler word{totalFillers === 1 ? "" : "s"} total</span>
        </div>
      </section>

      {strengths.length > 0 && (
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs font-medium text-teal-900">Your strengths</p>
          <ul className="mt-1.5 space-y-1">
            {strengths.map((m) => (
              <li key={m.key} className="text-sm text-teal-800">
                ✓ {m.label} — {m.average}/100
              </li>
            ))}
          </ul>
        </section>
      )}

      {focusAreas.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-900">Focus areas</p>
          <ul className="mt-1.5 space-y-1">
            {focusAreas.map((m) => (
              <li key={m.key} className="text-sm text-amber-800">
                • {m.label} — {m.average}/100
              </li>
            ))}
          </ul>
        </section>
      )}

      {weakest && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
          <p className="text-xs font-medium text-slate-600">Recommended practice</p>
          <p className="mt-1 text-sm text-slate-800">{METRIC_TIPS[weakest.key]}</p>
          <p className="mt-1 text-xs text-slate-400">
            Suggested next difficulty: {DIFFICULTY_LABELS[recommendedDifficulty(overallScore)]}
          </p>
        </section>
      )}

      {sessionId && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 print:hidden">
          <label htmlFor="session-notes" className="text-xs font-medium text-slate-600">
            Reflection notes
          </label>
          <textarea
            id="session-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            rows={3}
            placeholder="What do you want to remember or try differently next time?"
            className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600"
          />
          <p className="mt-1 text-[11px] text-slate-400">{notesSaved ? "Saved." : "Saved automatically when you click away."}</p>
        </section>
      )}

      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={handleCopySummary}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-[0.98]"
        >
          {copied ? "Copied!" : "Copy summary"}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-[0.98]"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:scale-[0.98]"
        >
          Print report
        </button>
      </div>

      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={onPracticeAgain}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-[0.98]"
        >
          Practice again
        </button>
        <Link
          href="/progress"
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-600 transition hover:border-slate-300 active:scale-[0.98]"
        >
          View progress
        </Link>
      </div>
    </div>
  );
}
