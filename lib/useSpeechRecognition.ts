"use client";

import { useCallback, useRef, useState } from "react";

type RecognitionState = "idle" | "listening" | "unsupported";

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Wraps the browser's built-in Web Speech API — free, no key, no server
 * round-trip. Supported in Chrome/Edge; other browsers fall back to
 * "unsupported" and the UI offers typing the answer instead.
 */
export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [state, setState] = useState<RecognitionState>(() => (getRecognitionConstructor() ? "idle" : "unsupported"));
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const finalRef = useRef("");
  // Longest gap between recognized speech segments — including the gap from
  // "start answering" to the first word — as a proxy for hesitation.
  const lastSpeechAtRef = useRef<number | null>(null);
  const longestPauseRef = useRef(0);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setState("unsupported");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
    const now = Date.now();
    startTimeRef.current = now;
    lastSpeechAtRef.current = now;
    longestPauseRef.current = 0;

    recognition.onresult = (event) => {
      const now = Date.now();
      if (lastSpeechAtRef.current !== null) {
        const gapSeconds = (now - lastSpeechAtRef.current) / 1000;
        if (gapSeconds > longestPauseRef.current) longestPauseRef.current = gapSeconds;
      }
      lastSpeechAtRef.current = now;

      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += `${result[0].transcript} `;
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(finalRef.current.trim());
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied. Allow microphone access and try again."
          : "Speech recognition ran into a problem. You can type your answer instead.",
      );
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
  }, []);

  /** Stops listening and returns the final transcript, timing, and the longest pause detected. */
  const stop = useCallback((): { transcript: string; durationSeconds: number; longestPauseSeconds: number } => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState((s) => (s === "unsupported" ? s : "idle"));
    const durationSeconds = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    return { transcript: finalRef.current.trim(), durationSeconds, longestPauseSeconds: longestPauseRef.current };
  }, []);

  return { transcript, interim, state, error, start, stop };
}
