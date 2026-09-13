"use client";

import { useEffect, useRef, useState } from "react";
import { useFaceEngagement } from "@/lib/useFaceEngagement";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { DIFFICULTY_LABELS, type EngagementSummary, type Question } from "@/lib/types";

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  cameraEnabled,
  onSubmit,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  cameraEnabled: boolean;
  onSubmit: (transcript: string, durationSeconds: number, engagement: EngagementSummary | null) => void;
}) {
  const { transcript, interim, state, error, start, stop } = useSpeechRecognition();
  const face = useFaceEngagement();
  const [typedAnswer, setTypedAnswer] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleStart() {
    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    start();
    if (cameraEnabled && videoRef.current) void face.start(videoRef.current);
  }

  function handleStopAndSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    const result = stop();
    const engagementSummary = cameraEnabled ? face.stop() : null;
    onSubmit(result.transcript, result.durationSeconds, engagementSummary);
  }

  function handleTypedSubmit() {
    // A rough words-per-minute baseline for typed answers: 40 wpm reading/composing pace.
    const wordCount = typedAnswer.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(10, (wordCount / 40) * 60);
    onSubmit(typedAnswer.trim(), estimatedSeconds, null);
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">
          Question {questionNumber} of {totalQuestions}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          {DIFFICULTY_LABELS[question.difficulty]}
        </span>
      </div>

      <p className="mt-3 text-lg font-medium leading-snug text-slate-900">{question.text}</p>

      {cameraEnabled && (
        <div className="mt-4 flex items-center gap-3">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-20 w-28 rounded-lg border border-slate-200 bg-slate-900 object-cover [transform:scaleX(-1)] ${
              state === "listening" ? "" : "opacity-40"
            }`}
          />
          <p className="text-xs text-slate-500">
            {face.state === "active"
              ? "Camera analysis running — checking that you're facing the camera."
              : face.state === "denied" || face.state === "unsupported"
                ? (face.error ?? "Camera analysis is unavailable — continuing with voice only.")
                : "Camera will start when you begin answering."}
          </p>
        </div>
      )}

      {state === "unsupported" ? (
        <div className="mt-5">
          <p className="text-xs text-slate-500">
            Speech recognition isn&apos;t supported in this browser (try Chrome or Edge). Type your answer instead.
          </p>
          <textarea
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            rows={5}
            placeholder="Type your answer here…"
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600"
          />
          <button
            type="button"
            onClick={handleTypedSubmit}
            disabled={typedAnswer.trim().length === 0}
            className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Submit answer
          </button>
        </div>
      ) : (
        <div className="mt-5">
          {state === "idle" && (
            <button
              type="button"
              onClick={handleStart}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-sm font-medium text-teal-700 transition hover:bg-teal-100"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
              </svg>
              Start answering
            </button>
          )}

          {state === "listening" && (
            <div>
              <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-rose-700">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-60" />
                    <span className="absolute inset-0 rounded-full bg-rose-600" />
                  </span>
                  Listening… {elapsed}s
                </span>
                <button
                  type="button"
                  onClick={handleStopAndSubmit}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Stop &amp; submit
                </button>
              </div>
              <div className="mt-3 min-h-16 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {transcript || interim ? (
                  <>
                    {transcript}
                    {interim && <span className="text-slate-400"> {interim}</span>}
                  </>
                ) : (
                  <span className="text-slate-400">Your answer will appear here as you speak…</span>
                )}
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
