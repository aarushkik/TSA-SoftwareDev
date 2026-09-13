"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import HowScoringWorksModal from "./HowScoringWorksModal";

export default function AppHeader() {
  const pathname = usePathname();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" aria-hidden>
                <path d="M8 9h8M8 13h5" strokeLinecap="round" />
                <path d="M21 12c0 4.4-4 8-9 8-1.1 0-2.2-.2-3.1-.5L4 21l1.3-3.8A7.9 7.9 0 013 12c0-4.4 4-8 9-8s9 3.6 9 8z" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-slate-900">Interview Coach</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                pathname === "/" ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Practice
            </Link>
            <Link
              href="/questions"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                pathname === "/questions" ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Questions
            </Link>
            <Link
              href="/progress"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                pathname === "/progress" ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Progress
            </Link>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-label="How scoring works"
              title="How scoring works"
              className="ml-1 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-5" strokeLinecap="round" />
                <circle cx="12" cy="8.2" r="0.6" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {infoOpen && <HowScoringWorksModal onClose={() => setInfoOpen(false)} />}
    </>
  );
}
