"use client";

import { useEffect, useState } from "react";
import { METRIC_EXPLANATIONS, METRIC_TIPS, WEIGHTS } from "@/lib/analysis";
import { METRIC_LABELS, type Metric } from "@/lib/types";

export default function HowScoringWorksModal({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState<Metric["key"] | null>(null);

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
          Every score is measured directly from your transcript, timing, and (if enabled) the camera and microphone —
          never from a language model guessing how good your answer &ldquo;felt&rdquo;. Each metric below is
          weighted, and the weights always sum to 100%. Tap a metric for the full breakdown.
        </p>

        <ul className="mt-4 divide-y divide-slate-100">
          {(Object.keys(WEIGHTS) as Metric["key"][]).map((key) => {
            const isOpen = expanded === key;
            const explanation = METRIC_EXPLANATIONS[key];
            return (
              <li key={key} className="py-1">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-baseline justify-between gap-3 py-2 text-left"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      aria-hidden
                    >
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {METRIC_LABELS[key]}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-teal-700">{Math.round(WEIGHTS[key] * 100)}%</span>
                </button>

                {isOpen && (
                  <div className="space-y-2 pb-3 pl-[18px] text-xs leading-relaxed text-slate-500">
                    <p>
                      <span className="font-medium text-slate-600">What we measure — </span>
                      {explanation.whatWeMeasure}
                    </p>
                    <p>
                      <span className="font-medium text-slate-600">Why it matters — </span>
                      {explanation.whyItMatters}
                    </p>
                    <p>
                      <span className="font-medium text-slate-600">How it&apos;s scored — </span>
                      {explanation.howScored}
                    </p>
                    <p className="rounded-lg bg-teal-50 p-2 text-teal-800">
                      <span className="font-medium">Tip — </span>
                      {METRIC_TIPS[key]}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
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
