"use client";

import { useEffect } from "react";
import { WEIGHTS } from "@/lib/analysis";
import type { Metric } from "@/lib/types";

const FACTOR_COPY: Record<Metric["key"], { detail: string }> = {
  communication: {
    detail: "Word count against a natural range for a well-developed answer — too short reads as underdeveloped, too long as rambling.",
  },
  pace: {
    detail: "Words per minute. 110–165 wpm is a natural conversational pace; much slower reads as hesitant, much faster as rushed.",
  },
  fillerControl: {
    detail: "Filler words (\"um\", \"like\", \"basically\"...) counted per 100 words, so longer answers aren't unfairly penalized for having more raw words.",
  },
  structure: {
    detail: "For behavioral questions only: whether your answer's wording shows Situation, Task, Action, and Result cues — the STAR method.",
  },
  engagement: {
    detail: "When camera analysis is on: the % of camera checks where your face was detected and roughly centred — a facing-the-camera proxy, not real gaze tracking.",
  },
  vocalEnergy: {
    detail: "How much your microphone volume varied while you spoke, measured directly from the audio. Flat volume scores lower; natural variation scores higher. This measures expressiveness, not confidence or emotion.",
  },
};

const METRIC_LABELS: Record<Metric["key"], string> = {
  communication: "Response substance",
  pace: "Speaking pace",
  fillerControl: "Filler word control",
  structure: "Answer structure (STAR)",
  engagement: "Eye contact & engagement",
  vocalEnergy: "Vocal energy",
};

export default function HowScoringWorksModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900">How scoring works</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Every score is measured directly from your transcript, timing, and (if enabled) the camera — never from a
          language model guessing how good your answer &ldquo;felt&rdquo;. Each metric below is weighted, and the
          weights always sum to 100%.
        </p>

        <ul className="mt-4 divide-y divide-slate-100">
          {(Object.keys(WEIGHTS) as Metric["key"][]).map((key) => (
            <li key={key} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{METRIC_LABELS[key]}</span>
                <span className="shrink-0 text-xs font-semibold text-teal-700">{Math.round(WEIGHTS[key] * 100)}%</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{FACTOR_COPY[key].detail}</p>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          If a metric can&apos;t be measured for a given answer — camera analysis is off, or a question isn&apos;t
          behavioral so STAR doesn&apos;t apply — its weight is redistributed across the metrics that were actually
          measured. A score never counts something that wasn&apos;t really checked.
        </p>
      </div>
    </div>
  );
}
