"use client";

import { useState } from "react";
import { JOB_TYPE_LABELS, type JobType } from "@/lib/types";

const JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as JobType[];
const QUESTION_COUNTS = [3, 5, 7];

export default function ScenarioPicker({
  onStart,
}: {
  onStart: (jobType: JobType, questionCount: number) => void;
}) {
  const [jobType, setJobType] = useState<JobType>("general");
  const [questionCount, setQuestionCount] = useState(5);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">Interview Coach</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Practice answering realistic interview questions out loud and get an immediate, transparent breakdown of your
        response — pace, filler words, and answer structure, measured directly from what you said.
      </p>

      <p className="mt-6 text-xs font-medium text-slate-600">What kind of role are you practicing for?</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {JOB_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setJobType(type)}
            aria-pressed={jobType === type}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
              jobType === type
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {JOB_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs font-medium text-slate-600">How many questions?</p>
      <div className="mt-2 flex gap-2">
        {QUESTION_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => setQuestionCount(count)}
            aria-pressed={questionCount === count}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
              questionCount === count
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {count}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onStart(jobType, questionCount)}
        className="mt-6 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700"
      >
        Start practice session
      </button>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Questions start at a beginner level and get harder as you score well. Your microphone is used only in your
        browser to transcribe your answer — nothing is uploaded anywhere.
      </p>
    </div>
  );
}
