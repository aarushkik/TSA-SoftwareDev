import CountUpNumber from "./CountUpNumber";
import MetricBar, { scoreColor } from "./MetricBar";
import type { AnsweredQuestion } from "@/lib/types";

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

export default function AnswerFeedback({
  answered,
  isLastQuestion,
  onNext,
  onRetry,
}: {
  answered: AnsweredQuestion;
  isLastQuestion: boolean;
  onNext: () => void;
  onRetry: () => void;
}) {
  const { question, analysis } = answered;
  const breakdown = fillerBreakdown(analysis.fillerWords);

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

        {analysis.transcript && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-600">What you said</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{analysis.transcript}</p>
          </div>
        )}
      </section>

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
