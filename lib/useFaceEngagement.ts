"use client";

import { useCallback, useRef, useState } from "react";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import type { EngagementSummary } from "./types";

/**
 * Camera-based engagement tracking, entirely in the browser — the webcam
 * feed never leaves the device. Runs Google's MediaPipe face detector (a
 * lightweight, pre-trained model loaded once from Google's public model
 * hosting) against video frames while you answer, and measures one honest
 * thing: how often your face was detected and roughly centred in frame,
 * as a proxy for facing the camera. This is NOT real gaze/eye tracking —
 * that needs per-person calibration to be meaningfully accurate, so this
 * build doesn't claim it.
 */

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

/** How far the detected face's center may drift from the frame's center (as a fraction of frame size) and still count as "facing the camera". */
const CENTERED_THRESHOLD = 0.24;
const SAMPLE_INTERVAL_MS = 400;

export type EngagementState = "idle" | "starting" | "active" | "unsupported" | "denied";

let detectorPromise: Promise<FaceDetector> | null = null;

async function getDetector(): Promise<FaceDetector> {
  detectorPromise ??= FilesetResolver.forVisionTasks(WASM_BASE).then(async (fileset) => {
    try {
      return await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
      });
    } catch {
      // Some browsers/machines reject the GPU delegate (no WebGL context, etc).
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
      });
    }
  });
  return detectorPromise;
}

const emptySummary = (): EngagementSummary => ({ totalSamples: 0, samplesWithFace: 0, samplesCentered: 0 });

export function useFaceEngagement() {
  const [state, setState] = useState<EngagementState>("idle");
  const [error, setError] = useState<string | null>(null);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const summaryRef = useRef<EngagementSummary>(emptySummary());

  const start = useCallback(async (video: HTMLVideoElement) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }

    setState("starting");
    setError(null);
    summaryRef.current = emptySummary();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      videoElRef.current = video;

      const detector = await getDetector();

      intervalRef.current = setInterval(() => {
        const v = videoElRef.current;
        if (!v || v.readyState < 2 || v.videoWidth === 0) return;

        const result = detector.detectForVideo(v, performance.now());
        const summary = summaryRef.current;
        summary.totalSamples += 1;

        const face = result.detections[0]?.boundingBox;
        if (face) {
          summary.samplesWithFace += 1;
          const centerX = (face.originX + face.width / 2) / v.videoWidth;
          const centerY = (face.originY + face.height / 2) / v.videoHeight;
          const offset = Math.hypot(centerX - 0.5, centerY - 0.5);
          if (offset <= CENTERED_THRESHOLD) summary.samplesCentered += 1;
        }
      }, SAMPLE_INTERVAL_MS);

      setState("active");
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setState(denied ? "denied" : "unsupported");
      setError(denied ? "Camera access was denied." : "Couldn't start the camera for engagement tracking.");
    }
  }, []);

  /** Stops the camera and detection loop, returning what was measured. */
  const stop = useCallback((): EngagementSummary => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    videoElRef.current = null;
    setState((s) => (s === "unsupported" || s === "denied" ? s : "idle"));
    return summaryRef.current;
  }, []);

  return { state, error, start, stop };
}
