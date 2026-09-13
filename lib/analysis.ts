import type { AnswerAnalysis, EngagementSummary, Metric, StarParts, VocalEnergySummary } from "./types";

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

/** A gap this long between recognized speech segments counts as a notable pause. */
const NOTABLE_PAUSE_SECONDS = 4;
/** Points lost from the pace score per second the longest pause exceeds the threshold above. */
const PAUSE_PENALTY_PER_SECOND = 4;

/** Fewer volume samples than this isn't enough to measure vocal dynamics reliably. */
const MIN_VOCAL_SAMPLES = 5;
/**
 * Coefficient of variation (volume std-dev / mean volume) at or above this
 * counts as fully expressive. Below it, the score falls off proportionally.
 * This is a direct measurement of volume dynamics, not a validated
 * "confidence" scale — the detail text says exactly that.
 */
const VOCAL_CV_FOR_FULL_SCORE = 0.28;

export const WEIGHTS: Record<Metric["key"], number> = {
  communication: 0.2,
  pace: 0.18,
  fillerControl: 0.17,
  structure: 0.17,
  engagement: 0.13,
  vocalEnergy: 0.15,
};

/** A concrete next step for the lowest-scoring metric — shown both per-answer and as a session-level recommendation. */
export const METRIC_TIPS: Record<Metric["key"], string> = {
  communication: "Work on developing fuller, more detailed answers with concrete specifics, not just general statements.",
  pace: "Practice pacing your speech more evenly and cutting down on long pauses.",
  fillerControl: "Focus on trimming filler words like \"um\" and \"like\" — pausing silently instead feels more confident.",
  structure: "Practice structuring answers with the STAR method: Situation, Task, Action, Result.",
  engagement: "Enable camera analysis and practice facing the camera consistently while you answer.",
  vocalEnergy: "Practice varying your tone instead of speaking in a flat monotone.",
};

export type MetricExplanation = {
  /** The concrete signal that's measured — no vague "we analyze your answer" language. */
  whatWeMeasure: string;
  /** Why an interviewer would actually care about this. */
  whyItMatters: string;
  /** The scoring rule in plain terms, built from the same constants the scorer itself uses. */
  howScored: string;
};

/**
 * A full breakdown of each metric, built directly from the same constants
 * the scorer uses above — so this explanation can never drift out of sync
 * with what's actually measured. Shown in "How scoring works" and per-answer.
 */
export const METRIC_EXPLANATIONS: Record<Metric["key"], MetricExplanation> = {
  communication: {
    whatWeMeasure: `Your answer's word count, compared against a ${LENGTH_IDEAL_MIN_WORDS}-${LENGTH_IDEAL_MAX_WORDS} word range typical of a well-developed spoken answer.`,
    whyItMatters:
      "Too short reads as underdeveloped or unprepared; too long reads as rambling and risks losing an interviewer's attention.",
    howScored: `Full marks inside the ideal range. Outside it, you lose about ${LENGTH_PENALTY_PER_WORD} points per word over or under the range.`,
  },
  pace: {
    whatWeMeasure: "Words spoken per minute, plus the longest silent gap between recognized speech segments.",
    whyItMatters:
      "A natural conversational pace is easier to follow — speaking too fast can read as rushed or nervous, too slow as hesitant or unprepared.",
    howScored: `Full marks between ${PACE_IDEAL_MIN_WPM}-${PACE_IDEAL_MAX_WPM} words per minute. Outside that range you lose about ${PACE_PENALTY_PER_WPM} points per word-per-minute, plus ${PAUSE_PENALTY_PER_SECOND} points per second a pause exceeds ${NOTABLE_PAUSE_SECONDS}s.`,
  },
  fillerControl: {
    whatWeMeasure: `Filler words and phrases (${FILLER_WORDS.map((f) => `"${f}"`).join(", ")}) counted as a rate per 100 words, not a raw count.`,
    whyItMatters: "Frequent fillers can make an answer sound less confident or prepared, even when the content itself is strong.",
    howScored: `You lose about ${FILLER_PENALTY_PER_RATE} points per filler word per 100 words spoken.`,
  },
  structure: {
    whatWeMeasure: "Whether your answer's wording contains cues for each part of the STAR method: Situation, Task, Action, Result.",
    whyItMatters:
      "Structured answers are easier for an interviewer to follow and show you can reason through the point of a story, not just recount it.",
    howScored: "25 points per STAR part detected. Only scored for behavioral questions — other questions redistribute this weight.",
  },
  engagement: {
    whatWeMeasure: "The share of camera checks (roughly every 0.4s) where a face was visible and roughly centered in frame.",
    whyItMatters: "Consistent eye contact with the camera — standing in for the interviewer — signals confidence and attentiveness.",
    howScored: `Score = percent of checks with a centered face. Requires at least ${MIN_ENGAGEMENT_SAMPLES} samples and camera analysis turned on.`,
  },
  vocalEnergy: {
    whatWeMeasure: "How much your microphone volume varied while you spoke, measured as the coefficient of variation (std. dev. ÷ mean).",
    whyItMatters: "Varying your tone helps emphasize key points and keeps an interviewer engaged; a flat monotone can undersell a strong answer.",
    howScored: `Full marks at a coefficient of variation of ${VOCAL_CV_FOR_FULL_SCORE} or higher. Requires at least ${MIN_VOCAL_SAMPLES} audio samples.`,
  },
};

/** How much weight a stated priority adds to its metric; the rest of the table scales down proportionally so it still sums to 1. */
const PRIORITY_BOOST = 0.12;

/**
 * The weight table for a given session: the base table, optionally tilted
 * toward one metric a walker — a practicer, here — said matters most to
 * them. This never changes how any metric is measured, only how much it
 * counts toward the overall score.
 */
export function buildWeights(priority: Metric["key"] | null = null): Record<Metric["key"], number> {
  if (!priority) return { ...WEIGHTS };

  const boosted = Math.min(0.6, WEIGHTS[priority] + PRIORITY_BOOST);
  const othersBefore = 1 - WEIGHTS[priority];
  const othersAfter = 1 - boosted;

  const out = {} as Record<Metric["key"], number>;
  for (const key of Object.keys(WEIGHTS) as Metric["key"][]) {
    out[key] = key === priority ? boosted : othersBefore > 0 ? WEIGHTS[key] * (othersAfter / othersBefore) : 0;
  }
  return out;
}

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

/** The exact phrase (if any) that matched each STAR cue — evidence for the checkmark, not just a boolean. */
function detectStarMatches(transcript: string): Partial<Record<keyof StarParts, string>> {
  const matches: Partial<Record<keyof StarParts, string>> = {};
  for (const key of Object.keys(STAR_CUES) as (keyof StarParts)[]) {
    const match = STAR_CUES[key].exec(transcript);
    if (match) matches[key] = match[0];
  }
  return matches;
}

function detectStarParts(matches: Partial<Record<keyof StarParts, string>>): StarParts {
  return {
    situation: matches.situation !== undefined,
    task: matches.task !== undefined,
    action: matches.action !== undefined,
    result: matches.result !== undefined,
  };
}

export function analyzeAnswer(
  transcript: string,
  durationSeconds: number,
  starRelevant: boolean,
  engagement: EngagementSummary | null = null,
  longestPauseSeconds = 0,
  vocalEnergy: VocalEnergySummary | null = null,
  weights: Record<Metric["key"], number> = WEIGHTS,
): AnswerAnalysis {
  const wordCount = countWords(transcript);
  const fillerWords = findFillerWords(transcript);
  const wordsPerMinute = durationSeconds > 0 ? (wordCount / durationSeconds) * 60 : 0;
  const starMatches = starRelevant ? detectStarMatches(transcript) : null;
  const starParts = starMatches ? detectStarParts(starMatches) : null;

  const metrics: Omit<Metric, "score" | "weight">[] = [];
  const rawScores: Record<Metric["key"], number> = {
    communication: 0,
    pace: 0,
    fillerControl: 0,
    structure: 0,
    engagement: 0,
    vocalEnergy: 0,
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

  // Pace: words per minute against a natural conversational range, plus a
  // penalty for a notably long pause (silence between recognized speech
  // segments) — both are about the flow of the answer, not its content.
  if (wordCount === 0 || durationSeconds <= 0) {
    metrics.push({ key: "pace", label: "Speaking pace", detail: "Not enough speech to measure pace", available: false });
  } else {
    const under = Math.max(0, PACE_IDEAL_MIN_WPM - wordsPerMinute);
    const over = Math.max(0, wordsPerMinute - PACE_IDEAL_MAX_WPM);
    const pauseOverage = Math.max(0, longestPauseSeconds - NOTABLE_PAUSE_SECONDS);
    rawScores.pace = clamp(100 - (under + over) * PACE_PENALTY_PER_WPM - pauseOverage * PAUSE_PENALTY_PER_SECOND);

    const paceDetail =
      wordsPerMinute < PACE_IDEAL_MIN_WPM
        ? `${Math.round(wordsPerMinute)} words per minute — a little slow, which can read as hesitant`
        : wordsPerMinute > PACE_IDEAL_MAX_WPM
          ? `${Math.round(wordsPerMinute)} words per minute — a little fast; slowing down aids clarity`
          : `${Math.round(wordsPerMinute)} words per minute — a natural, easy-to-follow pace`;
    const pauseDetail =
      pauseOverage > 0 ? ` Longest pause: ${longestPauseSeconds.toFixed(1)}s — okay occasionally, but a long silence can read as struggling to organize your answer.` : "";

    metrics.push({
      key: "pace",
      label: "Speaking pace",
      detail: paceDetail + pauseDetail,
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

  // Vocal energy: how much your volume varied while answering, measured
  // directly from the microphone via the Web Audio API (see
  // useVocalEnergy). This is expressiveness, not confidence or emotion —
  // the detail text says exactly what was measured.
  if (!vocalEnergy || vocalEnergy.sampleCount < MIN_VOCAL_SAMPLES) {
    metrics.push({
      key: "vocalEnergy",
      label: "Vocal energy",
      detail: "Not enough audio was captured to measure vocal dynamics",
      available: false,
    });
  } else {
    const cv = vocalEnergy.meanVolume > 0 ? vocalEnergy.volumeStdDev / vocalEnergy.meanVolume : 0;
    rawScores.vocalEnergy = clamp((cv / VOCAL_CV_FOR_FULL_SCORE) * 100);
    metrics.push({
      key: "vocalEnergy",
      label: "Vocal energy",
      detail:
        rawScores.vocalEnergy >= 70
          ? "Your volume varied naturally — an expressive, engaged delivery"
          : "Your volume stayed fairly flat — varying it a bit more can help emphasize key points",
      available: true,
    });
  }

  // Redistribute the weight of any unavailable metric across the rest, so
  // the weights always sum to 1 and the score never counts an unmeasured metric.
  const availableWeight = metrics
    .filter((m) => m.available)
    .reduce((sum, m) => sum + weights[m.key], 0);

  const finalMetrics: Metric[] = metrics.map((m) => ({
    ...m,
    score: m.available ? rawScores[m.key] : 0,
    weight: m.available && availableWeight > 0 ? weights[m.key] / availableWeight : 0,
  }));

  const overallScore =
    availableWeight > 0
      ? Math.round(finalMetrics.filter((m) => m.available).reduce((sum, m) => sum + m.score * m.weight, 0))
      : 0;

  return {
    transcript,
    wordCount,
    durationSeconds,
    wordsPerMinute,
    fillerWordCount: fillerWords.length,
    fillerWords,
    longestPauseSeconds,
    starParts,
    starMatches,
    metrics: finalMetrics,
    overallScore,
  };
}
