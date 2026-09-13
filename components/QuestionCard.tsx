"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hintFor } from "@/lib/hints";
import { getProfile } from "@/lib/profile";
import { useFaceEngagement } from "@/lib/useFaceEngagement";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useVocalEnergy } from "@/lib/useVocalEnergy";
import { DIFFICULTY_LABELS, type EngagementSummary, type Question, type VocalEnergySummary } from "@/lib/types";

/** A rough, generous target range for a spoken interview answer — not a hard rule, just a visual nudge. */
const IDEAL_MIN_SECONDS = 30;
const IDEAL_MAX_SECONDS = 90;

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  cameraEnabled,
  readAloud,
  voiceURI,
  speechRate,
  timeLimitSeconds,
  onSubmit,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  cameraEnabled: boolean;
  readAloud: boolean;
  /** null = the browser's default voice. */
  voiceURI: string | null;
  speechRate: number;
  /** null = no limit; otherwise the recording auto-submits once this many seconds elapse. */
  timeLimitSeconds: number | null;
  onSubmit: (
    transcript: string,
    durationSeconds: number,
    engagement: EngagementSummary | null,
    longestPauseSeconds: number,
    vocalEnergy: VocalEnergySummary | null,
  ) => void;
}) {
  const { transcript, interim, state, error, start, stop } = useSpeechRecognition();
  const face = useFaceEngagement();
  const energy = useVocalEnergy();
  const [typedAnswer, setTypedAnswer] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [reading, setReading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  function speakQuestion() {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.text);
    utterance.rate = speechRate;
    if (voiceURI) {
      const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
    }
    utterance.onstart = () => setReading(true);
    utterance.onend = () => setReading(false);
    utterance.onerror = () => setReading(false);
    window.speechSynthesis.speak(utterance);
  }

  // Reads the question aloud automatically when it changes, if enabled —
  // a real side effect (Web Speech API), not React state, so it's fine here.
  useEffect(() => {
    if (readAloud) speakQuestion();
    return () => {
      if (canSpeak) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-speak when the question itself changes
  }, [question.id, readAloud]);

  // Clear any revealed hint when a new question comes up.
  useEffect(() => {
    queueMicrotask(() => setHint(null));
  }, [question.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function handleShowHint() {
    setHint(hintFor(question, getProfile()));
  }

  const handleCancelRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    stop();
    if (cameraEnabled) face.stop();
    energy.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- face/energy are re-created each render; only stop identity and cameraEnabled matter here
  }, [stop, cameraEnabled]);

  // Escape cancels an in-progress recording without submitting it — a quick way out if you started by mistake.
  useEffect(() => {
    if (state !== "listening") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancelRecording();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, handleCancelRecording]);

  function handleStart() {
    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(secs);
      if (timeLimitSeconds !== null && secs >= timeLimitSeconds) handleStopAndSubmit();
    }, 250);
    start();
    if (cameraEnabled && videoRef.current) void face.start(videoRef.current);
    void energy.start();
  }

  function handleStopAndSubmit() {
    if (timerRef.current) clearInterval(timerRef.current);
    const result = stop();
    const engagementSummary = cameraEnabled ? face.stop() : null;
    const vocalEnergySummary = energy.stop();
    onSubmit(result.transcript, result.durationSeconds, engagementSummary, result.longestPauseSeconds, vocalEnergySummary);
  }

  function handleTypedSubmit() {
    // A rough words-per-minute baseline for typed answers: 40 wpm reading/composing pace.
    // No speech recognition ran, so there's no pause or vocal-energy signal — 0/null is honest, not guessed.
    const wordCount = typedAnswer.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.max(10, (wordCount / 40) * 60);
    onSubmit(typedAnswer.trim(), estimatedSeconds, null, 0, null);
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

      <div className="mt-3 flex items-start justify-between gap-2">
        <p className="text-lg font-medium leading-snug text-slate-900">{question.text}</p>
        {canSpeak && (
          <button
            type="button"
            onClick={speakQuestion}
            aria-label="Read question aloud"
            title="Read question aloud"
            className={`shrink-0 rounded-full p-1.5 transition active:scale-[0.98] ${
              reading ? "bg-teal-50 text-teal-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 9v6h4l5 5V4L8 9H4z" strokeLinejoin="round" />
              <path d="M16.5 8.5a5 5 0 010 7M19 6a9 9 0 010 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

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

      {hint ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          <span className="font-medium">Hint — </span>
          {hint}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleShowHint}
          className="mt-4 flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.4 1 1.1 1 1.9v.2h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0012 3z" strokeLinejoin="round" />
          </svg>
          Get a hint
        </button>
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
            className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3.5 text-sm font-medium text-teal-700 transition hover:bg-teal-100 active:scale-[0.98]"
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
                  {timeLimitSeconds !== null
                    ? `Listening… ${Math.max(0, timeLimitSeconds - elapsed)}s left`
                    : `Listening… ${elapsed}s`}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    title="Cancel (Esc)"
                    className="rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium text-rose-500 transition hover:bg-rose-100 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStopAndSubmit}
                    className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 active:scale-[0.98]"
                  >
                    Stop &amp; submit
                  </button>
                </div>
              </div>

              {timeLimitSeconds !== null ? (
                <>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                        timeLimitSeconds - elapsed <= 10 ? "bg-rose-500" : "bg-teal-500"
                      }`}
                      style={{ width: `${Math.min(100, (elapsed / timeLimitSeconds) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {timeLimitSeconds - elapsed <= 10
                      ? "Wrapping up automatically soon…"
                      : "Recording will submit automatically when time runs out."}
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                        elapsed < IDEAL_MIN_SECONDS
                          ? "bg-amber-400"
                          : elapsed <= IDEAL_MAX_SECONDS
                            ? "bg-teal-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, (elapsed / IDEAL_MAX_SECONDS) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {elapsed < IDEAL_MIN_SECONDS
                      ? `Aim for at least ${IDEAL_MIN_SECONDS}s — keep going.`
                      : elapsed <= IDEAL_MAX_SECONDS
                        ? "Good length — wrap up whenever you're ready."
                        : "Getting long — consider wrapping up soon."}
                  </p>
                </>
              )}

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
