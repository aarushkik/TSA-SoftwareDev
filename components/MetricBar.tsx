"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!metric.available) return;
    const frame = requestAnimationFrame(() => setWidth(Math.max(2, metric.score)));
    return () => cancelAnimationFrame(frame);
  }, [metric.available, metric.score]);

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">{metric.label}</span>
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
    </li>
  );
}
