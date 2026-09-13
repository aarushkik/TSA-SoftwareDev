import Link from "next/link";
import { scoreColor } from "./MetricBar";
import { DIFFICULTY_LABELS, type AnsweredQuestion, type Difficulty, type Metric } from "@/lib/types";

const METRIC_LABELS: Record<Metric["key"], string> = {
  communication: "Response substance",
  pace: "Speaking pace",
  fillerControl: "Filler word control",
  structure: "Answer structure",
  engagement: "Eye contact & engagement",
};

const CATEGORY_SUGGESTIONS: Record<Metric["key"], string> = {
  communication: "General questions — work on developing fuller, more detailed answers",
  pace: "Any category — practice pacing your speech and cutting down on long pauses",
  fillerControl: "Any category — focus on trimming filler words like \"um\" and \"like\"",
  structure: "Behavioral questions — practice structuring answers with the STAR method (Situation, Task, Action, Result)",
  engagement: "Enable camera analysis and practice facing the camera consistently while you answer",
};

function recommendedDifficulty(score: number): Difficulty {
  if (score >= 80) return "advanced";
  if (score < 50) return "beginner";
  return "intermediate";
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

export default function SessionSummary({
  answers,
  overallScore,
  onPracticeAgain,
}: {
  answers: AnsweredQuestion[];
  overallScore: number;
  onPracticeAgain: () => void;
}) {
  const averages = averageByMetric(answers).sort((a, b) => b.average - a.average);
  const strengths = averages.filter((m) => m.average >= 78);
  const focusAreas = averages.filter((m) => m.average < 65);
  const weakest = averages[averages.length - 1];
  const totalFillers = answers.reduce((sum, a) => sum + a.analysis.fillerWordCount, 0);
  const avgWpm = Math.round(
    answers.reduce((sum, a) => sum + a.analysis.wordsPerMinute, 0) / Math.max(1, answers.length),
  );

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-xs font-medium text-slate-500">Session complete</p>
        <p className={`mt-1 text-4xl font-bold tabular-nums ${scoreColor(overallScore)}`}>{overallScore}</p>
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
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-600">Recommended practice</p>
          <p className="mt-1 text-sm text-slate-800">{CATEGORY_SUGGESTIONS[weakest.key]}</p>
          <p className="mt-1 text-xs text-slate-400">
            Suggested next difficulty: {DIFFICULTY_LABELS[recommendedDifficulty(overallScore)]}
          </p>
        </section>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPracticeAgain}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          Practice again
        </button>
        <Link
          href="/progress"
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-600 transition hover:border-slate-300"
        >
          View progress
        </Link>
      </div>
    </div>
  );
}
