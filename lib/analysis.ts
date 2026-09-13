import type { AnswerAnalysis, EngagementSummary, Metric, StarParts } from "./types";

/**
 * Interview performance scoring.
 *
 * Every metric is measured directly from the transcript and timing of a
 * single answer — no AI model, no invented confidence number. A metric that
 * can't be measured (camera analysis wasn't turned on for this session)
 * is marked unavailable and its weight is redistributed across the metrics
 * that were actually measured, the same way PathSafe redistributes an
 * unavailable safety factor rather than guessing at it.
 */

const FILLER_WORDS = ["um", "uh", "umm", "uhh", "like", "basically", "actually", "literally", "so", "you know", "i mean"];

const PACE_IDEAL_MIN_WPM = 110;
const PACE_IDEAL_MAX_WPM = 165;
/** Points lost per word-per-minute outside the ideal range. */
const PACE_PENALTY_PER_WPM = 1.2;

/** Points lost per filler word per 100 words spoken. */
const FILLER_PENALTY_PER_RATE = 8;

const LENGTH_IDEAL_MIN_WORDS = 40;
const LENGTH_IDEAL_MAX_WORDS = 220;
/** Points lost per word outside the ideal length range. */
const LENGTH_PENALTY_PER_WORD = 0.6;

/** Fewer camera samples than this during an answer isn't enough to score reliably. */
const MIN_ENGAGEMENT_SAMPLES = 3;

export const WEIGHTS = {
  communication: 0.25,
  pace: 0.2,
  fillerControl: 0.2,
  structure: 0.2,
  engagement: 0.15,
} as const;

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function countWords(transcript: string): number {
  const trimmed = transcript.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function findFillerWords(transcript: string): string[] {
  const found: string[] = [];
  const lower = transcript.toLowerCase();
  for (const filler of FILLER_WORDS) {
    const pattern = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "g");
    const matches = lower.match(pattern);
    if (matches) found.push(...matches.map(() => filler));
  }
  return found;
}

/** Keyword cues for each part of the STAR structure. Deliberately simple pattern matching, not language understanding. */
const STAR_CUES: Record<keyof StarParts, RegExp> = {
  situation: /\b(there was a time|the situation was|at my|when i was|i was working on|while i was|during (my|a|an))\b/i,
  task: /\b(i needed to|i had to|my task was|i was responsible for|my job was to|i was asked to)\b/i,
  action: /\b(i decided to|so i|i started by|i took the initiative|i created|i worked with|i implemented|i organized|first i|then i|i reached out)\b/i,
  result: /\b(as a result|in the end|ultimately|this led to|which resulted in|because of this|the outcome was|i learned|we were able to|successfully|ended up)\b/i,
};

function detectStarParts(transcript: string): StarParts {
  return {
    situation: STAR_CUES.situation.test(transcript),
    task: STAR_CUES.task.test(transcript),
    action: STAR_CUES.action.test(transcript),
    result: STAR_CUES.result.test(transcript),
  };
}

export function analyzeAnswer(
  transcript: string,
  durationSeconds: number,
  starRelevant: boolean,
  engagement: EngagementSummary | null = null,
): AnswerAnalysis {
  const wordCount = countWords(transcript);
  const fillerWords = findFillerWords(transcript);
  const wordsPerMinute = durationSeconds > 0 ? (wordCount / durationSeconds) * 60 : 0;
  const starParts = starRelevant ? detectStarParts(transcript) : null;

  const metrics: Omit<Metric, "score">[] = [];
  const rawScores: Record<Metric["key"], number> = {
    communication: 0,
    pace: 0,
    fillerControl: 0,
    structure: 0,
    engagement: 0,
  };

  // Communication: is the answer substantial enough without rambling?
  if (wordCount === 0) {
    metrics.push({ key: "communication", label: "Response substance", detail: "No response was recorded", available: false });
  } else {
    const under = Math.max(0, LENGTH_IDEAL_MIN_WORDS - wordCount);
    const over = Math.max(0, wordCount - LENGTH_IDEAL_MAX_WORDS);
    rawScores.communication = clamp(100 - (under + over) * LENGTH_PENALTY_PER_WORD);
    metrics.push({
      key: "communication",
      label: "Response substance",
      detail:
        wordCount < LENGTH_IDEAL_MIN_WORDS
          ? `${wordCount} words — a bit short; try developing your example further`
          : wordCount > LENGTH_IDEAL_MAX_WORDS
            ? `${wordCount} words — thorough, but could be more concise`
            : `${wordCount} words — a well-developed length for this question`,
      available: true,
    });
  }

  // Pace: words per minute against a natural conversational range.
  if (wordCount === 0 || durationSeconds <= 0) {
    metrics.push({ key: "pace", label: "Speaking pace", detail: "Not enough speech to measure pace", available: false });
  } else {
    const under = Math.max(0, PACE_IDEAL_MIN_WPM - wordsPerMinute);
    const over = Math.max(0, wordsPerMinute - PACE_IDEAL_MAX_WPM);
    rawScores.pace = clamp(100 - (under + over) * PACE_PENALTY_PER_WPM);
    metrics.push({
      key: "pace",
      label: "Speaking pace",
      detail:
        wordsPerMinute < PACE_IDEAL_MIN_WPM
          ? `${Math.round(wordsPerMinute)} words per minute — a little slow, which can read as hesitant`
          : wordsPerMinute > PACE_IDEAL_MAX_WPM
            ? `${Math.round(wordsPerMinute)} words per minute — a little fast; slowing down aids clarity`
            : `${Math.round(wordsPerMinute)} words per minute — a natural, easy-to-follow pace`,
      available: true,
    });
  }

  // Filler word control: rate per 100 words, not raw count, so longer answers aren't unfairly penalized.
  if (wordCount === 0) {
    metrics.push({ key: "fillerControl", label: "Filler word control", detail: "No response was recorded", available: false });
  } else {
    const rate = (fillerWords.length / wordCount) * 100;
    rawScores.fillerControl = clamp(100 - rate * FILLER_PENALTY_PER_RATE);
    metrics.push({
      key: "fillerControl",
      label: "Filler word control",
      detail:
        fillerWords.length === 0
          ? "No filler words detected"
          : `${fillerWords.length} filler word${fillerWords.length === 1 ? "" : "s"} (${rate.toFixed(1)} per 100 words)`,
      available: true,
    });
  }

  // Structure: only scored for behavioral questions where STAR applies.
  if (!starRelevant || !starParts) {
    metrics.push({ key: "structure", label: "Answer structure (STAR)", detail: "Not applicable to this question", available: false });
  } else {
    const detected = Object.values(starParts).filter(Boolean).length;
    rawScores.structure = (detected / 4) * 100;
    const missing = (Object.keys(starParts) as (keyof StarParts)[]).filter((k) => !starParts[k]);
    metrics.push({
      key: "structure",
      label: "Answer structure (STAR)",
      detail:
        missing.length === 0
          ? "Situation, task, action, and result were all clearly present"
          : `Detected ${detected} of 4 STAR parts — missing: ${missing.join(", ")}`,
      available: true,
    });
  }

  // Engagement: % of camera samples where a face was detected and roughly
  // centred in frame (a facing-the-camera proxy, not real gaze tracking —
  // see useFaceEngagement). Unavailable if the camera wasn't on, or too few
  // samples were captured to mean anything.
  if (!engagement || engagement.totalSamples < MIN_ENGAGEMENT_SAMPLES) {
    metrics.push({
      key: "engagement",
      label: "Eye contact & engagement",
      detail: "Camera analysis wasn't enabled for this session",
      available: false,
    });
  } else {
    rawScores.engagement = clamp((engagement.samplesCentered / engagement.totalSamples) * 100);
    const presentRate = Math.round((engagement.samplesWithFace / engagement.totalSamples) * 100);
    metrics.push({
      key: "engagement",
      label: "Eye contact & engagement",
      detail:
        engagement.samplesWithFace === 0
          ? "No face was detected in the camera frame during your answer"
          : `Facing the camera in ${Math.round(rawScores.engagement)}% of camera checks (face visible ${presentRate}% of the time)`,
      available: true,
    });
  }

  // Redistribute the weight of any unavailable metric across the rest, so
  // the weights always sum to 1 and the score never counts an unmeasured metric.
  const availableWeight = metrics
    .filter((m) => m.available)
    .reduce((sum, m) => sum + WEIGHTS[m.key], 0);

  const finalMetrics: Metric[] = metrics.map((m) => ({
    ...m,
    score: m.available ? rawScores[m.key] : 0,
  }));

  const overallScore =
    availableWeight > 0
      ? Math.round(
          finalMetrics
            .filter((m) => m.available)
            .reduce((sum, m) => sum + m.score * (WEIGHTS[m.key] / availableWeight), 0),
        )
      : 0;

  return {
    transcript,
    wordCount,
    durationSeconds,
    wordsPerMinute,
    fillerWordCount: fillerWords.length,
    fillerWords,
    starParts,
    metrics: finalMetrics,
    overallScore,
  };
}
