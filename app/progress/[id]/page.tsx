"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import MetricBar, { scoreColor } from "@/components/MetricBar";
import { getSessions, getSessionsServerSnapshot, subscribeSessions } from "@/lib/sessions";
import { DIFFICULTY_LABELS, JOB_TYPE_LABELS } from "@/lib/types";

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessions = useSyncExternalStore(subscribeSessions, getSessions, getSessionsServerSnapshot);
  const session = sessions.find((s) => s.id === params.id);

  if (!session) {
    return (
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-sm text-slate-500">Session not found — it may have been deleted.</p>
          <Link href="/progress" className="mt-3 inline-block text-sm font-medium text-teal-700 hover:text-teal-800">
            Back to progress
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-3">
        <Link href="/progress" className="text-xs font-medium text-slate-400 hover:text-slate-600">
          ← Back to progress
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <p className="text-xs text-slate-500">
            {JOB_TYPE_LABELS[session.jobType]} ·{" "}
            {new Date(session.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${scoreColor(session.overallScore)}`}>{session.overallScore}</p>
          <p className="text-xs text-slate-400">
            out of 100 · {session.answers.length} question{session.answers.length === 1 ? "" : "s"}
          </p>
          {session.notes && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-left text-xs italic text-slate-500">&ldquo;{session.notes}&rdquo;</p>
          )}
        </section>

        {session.answers.map((a, i) => (
          <section key={`${session.id}-${i}`} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">
                Question {i + 1} · {DIFFICULTY_LABELS[a.question.difficulty]}
              </p>
              <p className={`text-sm font-semibold tabular-nums ${scoreColor(a.analysis.overallScore)}`}>
                {a.analysis.overallScore}/100
              </p>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-800">{a.question.text}</p>
            <ul className="mt-1 divide-y divide-slate-100">
              {a.analysis.metrics.map((m) => (
                <MetricBar key={m.key} metric={m} />
              ))}
            </ul>
            {a.analysis.transcript && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium text-slate-600">What you said</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.analysis.transcript}</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
