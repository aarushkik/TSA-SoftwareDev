"use client";

import { useCallback, useRef, useState } from "react";
import type { VocalEnergySummary } from "./types";

/**
 * Measures vocal expressiveness from the microphone while you're
 * answering — entirely in the browser via the Web Audio API, audio never
 * leaves the device. This is NOT a confidence or emotion detector: it
 * directly measures how much your volume varies over time. Flat, monotone
 * delivery has low variance; natural, expressive speech has more.
 */

type EnergyState = "idle" | "active" | "unsupported";

const SAMPLE_INTERVAL_MS = 150;
const MIN_SAMPLES = 5;

export function useVocalEnergy() {
  const [state, setState] = useState<EnergyState>("idle");

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);

  const start = useCallback(async () => {
    const AudioContextCtor = typeof window === "undefined" ? undefined : (window.AudioContext ?? window.webkitAudioContext);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || !AudioContextCtor) {
      setState("unsupported");
      return;
    }

    samplesRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.fftSize);
      intervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const normalized = (buffer[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        samplesRef.current.push(Math.sqrt(sumSquares / buffer.length));
      }, SAMPLE_INTERVAL_MS);

      setState("active");
    } catch {
      // Mic access for this analysis is best-effort — speech recognition
      // already covers the core answer capture, so a failure here just
      // means the vocal-energy metric stays unavailable.
      setState("unsupported");
    }
  }, []);

  /** Stops sampling and returns a volume summary, or null if too little was captured to mean anything. */
  const stop = useCallback((): VocalEnergySummary | null => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    setState((s) => (s === "unsupported" ? s : "idle"));

    const samples = samplesRef.current;
    if (samples.length < MIN_SAMPLES) return null;

    const meanVolume = samples.reduce((sum, v) => sum + v, 0) / samples.length;
    const variance = samples.reduce((sum, v) => sum + (v - meanVolume) ** 2, 0) / samples.length;
    return { sampleCount: samples.length, meanVolume, volumeStdDev: Math.sqrt(variance) };
  }, []);

  return { state, start, stop };
}
