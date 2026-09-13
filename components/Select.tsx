"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * A native <select> (keeps full accessibility and mobile behavior) with a
 * consistent, nicer look — custom chevron, hover/focus states — instead of
 * the browser's bare default. `className` sizes and positions the wrapper;
 * pass an explicit width (e.g. "w-40") rather than relying on shrink-to-fit.
 */
export default function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative inline-block ${className}`}>
      <select
        {...props}
        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-2.5 pr-7 text-xs text-slate-700 outline-none transition hover:border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
