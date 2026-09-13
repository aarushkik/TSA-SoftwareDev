"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { getSessions, getSessionsServerSnapshot, subscribeSessions } from "@/lib/sessions";
import {
  DIFFICULTY_LABELS,
  JOB_TYPE_LABELS,
  METRIC_LABELS,
  type CategoryFilter,
  type Difficulty,
  type JobType,
  type Metric,
  type StartOptions,
} from "@/lib/types";

const JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as JobType[];
const QUESTION_COUNTS = [3, 5, 7];

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "All",
  general: "General",
  behavioral: "Behavioral",
  technical: "Technical",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS) as CategoryFilter[];

const DIFFICULTY_OPTIONS: (Difficulty | null)[] = [null, "beginner", "intermediate", "advanced"];

const LAST_SETTINGS_KEY = "interview-coach.last-settings.v1";

const TIME_LIMIT_OPTIONS: (number | null)[] = [null, 60, 90, 120];
const TIME_LIMIT_LABELS: Record<string, string> = {
  none: "No limit",
  "60": "60s",
  "90": "90s",
  "120": "120s",
};

const PRIORITY_OPTIONS: (Metric["key"] | null)[] = [null, ...(Object.keys(METRIC_LABELS) as Metric["key"][])];

const JOB_TYPE_ICONS: Record<JobType, ReactNode> = {
  general: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.5-3.5 4.2-5.5 7-5.5s5.5 2 7 5.5" strokeLinecap="round" />
    </svg>
  ),
  technology: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" strokeLinecap="round" />
    </svg>
  ),
  business: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="8" width="18" height="12" rx="1.5" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
    </svg>
  ),
  customer_service: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 13a8 8 0 0116 0" strokeLinecap="round" />
      <rect x="3" y="13" width="4" height="6" rx="1" />
      <rect x="17" y="13" width="4" height="6" rx="1" />
    </svg>
  ),
  creative: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3a9 9 0 000 18c1.4 0 2-1 1.3-2.1-.4-.6-.1-1.4.6-1.5H16a4 4 0 004-4c0-5.5-3.6-10.4-8-10.4z" strokeLinejoin="round" />
      <circle cx="8" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="11" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default function ScenarioPicker({ onStart }: { onStart: (options: StartOptions) => void }) {
  const sessions = useSyncExternalStore(subscribeSessions, getSessions, getSessionsServerSnapshot);
  const [jobType, setJobType] = useState<JobType>("general");
  const [questionCount, setQuestionCount] = useState(5);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [priority, setPriority] = useState<Metric["key"] | null>(null);
  const [fixedDifficulty, setFixedDifficulty] = useState<Difficulty | null>(null);
  const [readAloud, setReadAloud] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [examMode, setExamMode] = useState(false);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);

  // Voice lists load asynchronously in most browsers — the first call to
  // getVoices() often returns empty until "voiceschanged" fires.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // Restores whatever setup a returning user last practiced with, so they
  // don't have to reconfigure everything on every visit.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_SETTINGS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<StartOptions>;
      queueMicrotask(() => {
        if (saved.jobType) setJobType(saved.jobType);
        if (saved.questionCount) setQuestionCount(saved.questionCount);
        if (typeof saved.cameraEnabled === "boolean") setCameraEnabled(saved.cameraEnabled);
        if (saved.category) setCategory(saved.category);
        if (saved.priority !== undefined) setPriority(saved.priority);
        if (saved.fixedDifficulty !== undefined) setFixedDifficulty(saved.fixedDifficulty);
        if (typeof saved.readAloud === "boolean") setReadAloud(saved.readAloud);
        if (saved.voiceURI !== undefined) setVoiceURI(saved.voiceURI);
        if (typeof saved.speechRate === "number") setSpeechRate(saved.speechRate);
        if (typeof saved.examMode === "boolean") setExamMode(saved.examMode);
        if (saved.timeLimitSeconds !== undefined) setTimeLimitSeconds(saved.timeLimitSeconds);
      });
    } catch {
      // Malformed or missing data — the defaults above stand.
    }
  }, []);

  function handleStart() {
    const options: StartOptions = {
      jobType,
      questionCount,
      cameraEnabled,
      category,
      priority,
      fixedDifficulty,
      readAloud,
      voiceURI,
      speechRate,
      examMode,
      timeLimitSeconds,
    };
    try {
      window.localStorage.setItem(LAST_SETTINGS_KEY, JSON.stringify(options));
    } catch {
      // Private browsing or a full quota: the choice just won't be remembered next time.
    }
    onStart(options);
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">Start a practice session</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Answer realistic interview questions out loud and get an immediate, transparent breakdown of your response —
        pace, filler words, and answer structure, measured directly from what you said.
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 shrink-0 text-slate-400" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-5" strokeLinecap="round" />
          <circle cx="12" cy="8.2" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        <p className="text-xs leading-relaxed text-slate-500">
          Works best in <span className="font-medium text-slate-700">Chrome or Edge</span>. When you click &ldquo;Start
          answering,&rdquo; your browser will ask for microphone access (and camera access too, if camera analysis is
          on) — click Allow. Other browsers fall back to typing your answer instead.
        </p>
      </div>

      {sessions.length > 0 && daysSince(sessions[0].completedAt) >= 3 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          It&apos;s been {daysSince(sessions[0].completedAt)} days since your last practice session — ready to pick
          back up?
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">What kind of role are you practicing for?</p>
        <button
          type="button"
          onClick={() => setJobType(JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)])}
          className="text-[11px] font-medium text-teal-700 hover:text-teal-800"
        >
          🎲 Surprise me
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {JOB_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setJobType(type)}
            aria-pressed={jobType === type}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.98] ${
              jobType === type
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <span className={jobType === type ? "text-teal-600" : "text-slate-400"}>{JOB_TYPE_ICONS[type]}</span>
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
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
              questionCount === count
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {count}
          </button>
        ))}
      </div>

      <p className="mt-5 text-xs font-medium text-slate-600">Question category</p>
      <div className="mt-2 flex gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-medium transition active:scale-[0.98] ${
              category === c
                ? "border-teal-600 bg-teal-50 text-teal-800"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <details className="mt-5 rounded-xl border border-slate-200">
        <summary className="cursor-pointer list-none px-3.5 py-3 text-xs font-medium text-slate-600">
          More options
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-3.5 py-3.5">
          <div>
            <p className="text-xs font-medium text-slate-600">Difficulty</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((d) => (
                <button
                  key={d ?? "adaptive"}
                  type="button"
                  onClick={() => setFixedDifficulty(d)}
                  aria-pressed={fixedDifficulty === d}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98] ${
                    fixedDifficulty === d
                      ? "border-teal-600 bg-teal-50 text-teal-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {d === null ? "Adaptive" : DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {fixedDifficulty === null
                ? "Starts easy and gets harder as you score well."
                : `Every question stays at ${DIFFICULTY_LABELS[fixedDifficulty].toLowerCase()} difficulty.`}
            </p>
          </div>

          <div>
            <label htmlFor="priority-select" className="text-xs font-medium text-slate-600">
              Focus scoring on
            </label>
            <select
              id="priority-select"
              value={priority ?? ""}
              onChange={(e) => setPriority((e.target.value || null) as Metric["key"] | null)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-teal-600"
            >
              <option value="">Balanced (default)</option>
              {PRIORITY_OPTIONS.filter((p): p is Metric["key"] => p !== null).map((p) => (
                <option key={p} value={p}>
                  {METRIC_LABELS[p]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">Weights that metric more heavily in your overall score.</p>
          </div>

          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Read questions aloud</span>
            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
              <input
                type="checkbox"
                checked={readAloud}
                onChange={(e) => setReadAloud(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-600" />
              <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
            </span>
          </label>

          {readAloud && voices.length > 0 && (
            <div className="space-y-2.5 rounded-lg bg-slate-50 p-3">
              <div>
                <label htmlFor="voice-select" className="text-[11px] font-medium text-slate-500">
                  Voice
                </label>
                <select
                  id="voice-select"
                  value={voiceURI ?? ""}
                  onChange={(e) => setVoiceURI(e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-600"
                >
                  <option value="">Browser default</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rate-slider" className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Speaking rate</span>
                  <span>{speechRate.toFixed(2)}x</span>
                </label>
                <input
                  id="rate-slider"
                  type="range"
                  min={0.75}
                  max={1.25}
                  step={0.05}
                  value={speechRate}
                  onChange={(e) => setSpeechRate(Number(e.target.value))}
                  className="mt-1 w-full accent-teal-600"
                />
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-600">Time limit per answer</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_LIMIT_OPTIONS.map((t) => (
                <button
                  key={t ?? "none"}
                  type="button"
                  onClick={() => setTimeLimitSeconds(t)}
                  aria-pressed={timeLimitSeconds === t}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98] ${
                    timeLimitSeconds === t
                      ? "border-teal-600 bg-teal-50 text-teal-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {TIME_LIMIT_LABELS[t === null ? "none" : String(t)]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {timeLimitSeconds === null
                ? "Take as long as you need to answer."
                : `Recording submits automatically at ${timeLimitSeconds}s.`}
            </p>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs font-medium text-slate-700">Exam mode</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-400">
                Holds all feedback until the end, like a real interview — no score between questions.
              </span>
            </span>
            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
              <input
                type="checkbox"
                checked={examMode}
                onChange={(e) => setExamMode(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-600" />
              <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
            </span>
          </label>
        </div>
      </details>

      <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
        <span className="min-w-0 pr-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            Enable camera analysis
            <span className="rounded-full bg-slate-200 px-1.5 py-px text-[9px] font-bold uppercase leading-tight text-slate-600">Beta</span>
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Scores how often you face the camera during each answer. Video stays in your browser — nothing is uploaded.
          </span>
        </span>
        <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
          <input
            type="checkbox"
            checked={cameraEnabled}
            onChange={(e) => setCameraEnabled(e.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-600" />
          <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
        </span>
      </label>

      <button
        type="button"
        onClick={handleStart}
        className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-[0.98]"
      >
        Start practice session
      </button>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Questions start at a beginner level and get harder as you score well. Your microphone and camera are used only
        in your browser to score your answer — nothing is uploaded anywhere.
      </p>
    </div>
  );
}
