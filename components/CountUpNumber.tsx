"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;

/** Animates a number counting up to its target value once, on mount or when the value changes. */
export default function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      queueMicrotask(() => setDisplay(value));
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      // Ease-out cubic — fast start, gentle settle, reads as confident rather than sluggish.
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  return <span className={className}>{display}</span>;
}
