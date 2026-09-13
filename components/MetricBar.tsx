"use client";

import { useEffect, useState } from "react";
import { METRIC_EXPLANATIONS, METRIC_TIPS } from "@/lib/analysis";
import type { Metric } from "@/lib/types";

export function scoreColor(score: number): string {
  if (score >= 80) return "text-teal-700";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-teal-600";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export default function MetricBar({ metric }: { metric: Metric }) {
  // Starts at 0 and fills to the real score just after mount, so the bar
  // reads as data animating in rather than appearing pre-filled.
  const [width, setWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!metric.available) return;
    const frame = requestAnimationFrame(() => setWidth(Math.max(2, metric.score)));
    return () => cancelAnimationFrame(frame);
  }, [metric.available, metric.score]);

  const explanation = METRIC_EXPLANATIONS[metric.key];

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-sm font-medium text-slate-800"
        >
          {metric.label}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {metric.available && (
          <span className={`shrink-0 text-xs font-semibold tabular-nums ${scoreColor(metric.score)}`}>
            {Math.round(metric.score)}/100
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {metric.available && (
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${barColor(metric.score)}`}
            style={{ width: `${width}%` }}
          />
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{metric.detail}</p>

      {expanded && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500">
          <p>
            <span className="font-medium text-slate-600">Why it matters — </span>
            {explanation.whyItMatters}
          </p>
          <p>
            <span className="font-medium text-slate-600">How it&apos;s scored — </span>
            {explanation.howScored}
          </p>
          {metric.available && metric.score < 70 && (
            <p className="text-teal-700">
              <span className="font-medium">Tip — </span>
              {METRIC_TIPS[metric.key]}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
