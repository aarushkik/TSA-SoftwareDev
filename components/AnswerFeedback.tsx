"use client";

import { useEffect } from "react";
import CountUpNumber from "./CountUpNumber";
import MetricBar, { scoreColor } from "./MetricBar";
import { METRIC_TIPS } from "@/lib/analysis";
import type { AnsweredQuestion, StarParts } from "@/lib/types";

const STAR_LABELS: Record<keyof StarParts, string> = {
  situation: "Situation",
  task: "Task",
  action: "Action",
  result: "Result",
};

function fillerBreakdown(fillerWords: string[]): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const word of fillerWords) counts.set(word, (counts.get(word) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

function encouragement(score: number): string {
  if (score >= 85) return "Great job — here's the breakdown.";
  if (score >= 65) return "Solid answer — here's where you can sharpen it.";
  return "Here's what to work on for next time.";
}

/** How a 1-5 self-rating compares to the measured score, in the same terms self-awareness research uses. */
function selfAwarenessNote(selfRating: number, overallScore: number): string {
  const gap = overallScore - selfRating * 20;
  if (gap > 15) return "You scored higher than you expected — you may be more prepared than you think.";
  if (gap < -15) return "You rated yourself higher than you scored — worth a closer look at the breakdown below.";
  return "Your self-rating was close to your actual score — good self-awareness.";
}

export default function AnswerFeedback({
  answered,
  isLastQuestion,
  previousAttemptScore,
  onNext,
  onRetry,
  onRateSelf,
}: {
  answered: AnsweredQuestion;
  isLastQuestion: boolean;
  /** The overall score from the attempt just discarded by "Try again", if this is a retry. */
  previousAttemptScore: number | null;
  onNext: () => void;
  onRetry: () => void;
  onRateSelf: (rating: number) => void;
}) {
  const { question, analysis } = answered;
  const breakdown = fillerBreakdown(analysis.fillerWords);
  const scoreDelta = previousAttemptScore !== null ? analysis.overallScore - previousAttemptScore : null;
  const weakest = analysis.metrics
    .filter((m) => m.available)
    .sort((a, b) => a.score - b.score)[0];

  // A quick Enter-to-continue shortcut, since there's no text field on this screen to conflict with.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") onNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNext]);

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Answer feedback</h2>
            <p className="mt-0.5 text-xs text-slate-500">{encouragement(analysis.overallScore)}</p>
          </div>
          <p className={`text-2xl font-semibold tabular-nums ${scoreColor(analysis.overallScore)}`}>
            <CountUpNumber value={analysis.overallScore} />
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-slate-500">&ldquo;{question.text}&rdquo;</p>

        {scoreDelta !== null && (
          <p
            className={`mt-2 text-xs font-medium ${
              scoreDelta > 0 ? "text-teal-700" : scoreDelta < 0 ? "text-rose-600" : "text-slate-500"
            }`}
          >
            {scoreDelta > 0
              ? `+${scoreDelta} points vs. your last attempt (${previousAttemptScore}/100)`
              : scoreDelta < 0
                ? `${scoreDelta} points vs. your last attempt (${previousAttemptScore}/100)`
                : `Same score as your last attempt (${previousAttemptScore}/100)`}
          </p>
        )}

        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          {analysis.selfRating === undefined ? (
            <>
              <p className="text-xs font-medium text-slate-600">How do you think you did?</p>
              <div className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onRateSelf(n)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 transition hover:border-teal-400 hover:text-teal-700 active:scale-[0.95]"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-600">
              You rated yourself <span className="font-medium text-slate-800">{analysis.selfRating}/5</span> —{" "}
              {selfAwarenessNote(analysis.selfRating, analysis.overallScore)}
            </p>
          )}
        </div>

        <ul className="mt-1 divide-y divide-slate-100">
          {analysis.metrics.map((m) => (
            <MetricBar key={m.key} metric={m} />
          ))}
        </ul>

        {breakdown.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-600">Filler words used</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {breakdown.map(({ word, count }) => (
                <span key={word} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  &ldquo;{word}&rdquo; ×{count}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.starParts && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-600">STAR structure detected</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(Object.keys(STAR_LABELS) as (keyof StarParts)[]).map((part) => {
                const present = analysis.starParts![part];
                return (
                  <span
                    key={part}
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      present ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {present ? "✓" : "○"} {STAR_LABELS[part]}
                  </span>
                );
              })}
            </div>
            {analysis.starMatches && Object.keys(analysis.starMatches).length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {(Object.keys(STAR_LABELS) as (keyof StarParts)[])
                  .filter((part) => analysis.starMatches?.[part])
                  .map((part) => (
                    <li key={part} className="text-[11px] text-slate-400">
                      <span className="font-medium text-slate-500">{STAR_LABELS[part]}:</span> &ldquo;
                      {analysis.starMatches![part]}&rdquo;
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        {analysis.transcript && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-600">What you said</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{analysis.transcript}</p>
          </div>
        )}
      </section>

      {weakest && weakest.score < 65 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-900">Try this next time</p>
          <p className="mt-1 text-sm text-amber-800">{METRIC_TIPS[weakest.key]}</p>
        </section>
      )}

      {question.followUp && analysis.overallScore >= 70 && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-medium text-indigo-900">A real interviewer might follow up with:</p>
          <p className="mt-1 text-sm text-indigo-800">&ldquo;{question.followUp}&rdquo;</p>
        </section>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 active:scale-[0.98]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-[0.98]"
        >
          {isLastQuestion ? "Finish session" : "Next question"}
        </button>
      </div>
    </div>
  );
}
