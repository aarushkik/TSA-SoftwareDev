import MetricBar, { scoreColor } from "./MetricBar";
import type { AnsweredQuestion } from "@/lib/types";

export default function AnswerFeedback({
  answered,
  isLastQuestion,
  onNext,
}: {
  answered: AnsweredQuestion;
  isLastQuestion: boolean;
  onNext: () => void;
}) {
  const { question, analysis } = answered;

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Answer feedback</h2>
          <p className={`text-2xl font-semibold tabular-nums ${scoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-500">&ldquo;{question.text}&rdquo;</p>

        <ul className="mt-1 divide-y divide-slate-100">
          {analysis.metrics.map((m) => (
            <MetricBar key={m.key} metric={m} />
          ))}
        </ul>

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

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
      >
        {isLastQuestion ? "Finish session" : "Next question"}
      </button>
    </div>
  );
}
