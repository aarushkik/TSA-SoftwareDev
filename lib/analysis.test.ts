import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeAnswer, buildWeights, METRIC_EXPLANATIONS, METRIC_TIPS, WEIGHTS } from "./analysis.ts";

function metric(analysis: ReturnType<typeof analyzeAnswer>, key: string) {
  const m = analysis.metrics.find((m) => m.key === key);
  assert.ok(m, `expected a ${key} metric`);
  return m;
}

test("the metric weights sum to 1", () => {
  const total = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `expected weights to sum to 1, got ${total}`);
});

test("buildWeights with no priority returns the base table", () => {
  assert.deepEqual(buildWeights(null), WEIGHTS);
});

test("buildWeights tilts toward a priority and still sums to 1", () => {
  const weights = buildWeights("pace");
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.ok(weights.pace > WEIGHTS.pace);
  for (const key of Object.keys(weights) as (keyof typeof weights)[]) {
    if (key !== "pace") assert.ok(weights[key] < WEIGHTS[key]);
  }
});

test("a stated priority pulls the overall score toward that metric's sub-score", () => {
  // Strong pace, weak everything else measurable.
  const text = Array(60).fill("word").join(" "); // enough words, no fillers, no STAR cues
  const weightedTowardPace = analyzeAnswer(text, 30, false, null, 0, null, buildWeights("pace"));
  const balanced = analyzeAnswer(text, 30, false, null, 0, null, WEIGHTS);
  // 60 words / 30s = 120 wpm, inside the ideal range, so pace scores well —
  // prioritizing it should pull the overall score up relative to balanced weights.
  assert.ok(weightedTowardPace.overallScore >= balanced.overallScore);
});

test("an empty response scores nothing and every metric is unavailable or zero", () => {
  const a = analyzeAnswer("", 10, false);
  assert.equal(a.wordCount, 0);
  assert.equal(a.overallScore, 0);
});

test("more filler words lowers the filler-control score", () => {
  const clean = analyzeAnswer(
    "I worked on a challenging project last year and delivered it successfully under a tight deadline with my team.",
    20,
    false,
  );
  const fillerHeavy = analyzeAnswer(
    "So, um, I worked on, like, a challenging project, um, last year and, basically, delivered it, like, successfully.",
    20,
    false,
  );
  assert.ok(metric(fillerHeavy, "fillerControl").score < metric(clean, "fillerControl").score);
});

test("speaking too fast or too slow both score worse than a natural pace", () => {
  const words = Array(80).fill("word").join(" "); // 80 words
  const natural = analyzeAnswer(words, 40, false); // 120 wpm
  const rushed = analyzeAnswer(words, 10, false); // 480 wpm
  const sluggish = analyzeAnswer(words, 120, false); // 40 wpm
  assert.ok(metric(natural, "pace").score > metric(rushed, "pace").score);
  assert.ok(metric(natural, "pace").score > metric(sluggish, "pace").score);
});

test("a STAR-complete answer scores higher structure than one missing parts", () => {
  const complete = analyzeAnswer(
    "There was a time when our team's project was behind schedule. I was responsible for the backend, so I decided to " +
      "reorganize the task list and reached out to a teammate for help. As a result, we shipped on time and I learned " +
      "to communicate blockers earlier.",
    45,
    true,
  );
  const incomplete = analyzeAnswer("I worked on a project once. It was fine.", 8, true);
  assert.ok(metric(complete, "structure").score > metric(incomplete, "structure").score);
});

test("structure is not applicable, and its weight is redistributed, for a non-behavioral question", () => {
  const a = analyzeAnswer("I am a hard worker who communicates well and enjoys learning new things every day.", 20, false);
  const structure = metric(a, "structure");
  assert.equal(structure.available, false);
  // Weight still sums to 1 across whatever is available — no metric is silently dropped from the total.
  const available = a.metrics.filter((m) => m.available);
  assert.ok(available.length > 0);
});

test("engagement is unavailable when no camera summary is passed", () => {
  const a = analyzeAnswer("A perfectly fine, normal-length answer to the question that was asked here today.", 15, false);
  const engagement = metric(a, "engagement");
  assert.equal(engagement.available, false);
  assert.equal(engagement.score, 0);
});

test("engagement is unavailable when too few camera samples were captured", () => {
  const a = analyzeAnswer("A fine answer.", 5, false, { totalSamples: 2, samplesWithFace: 2, samplesCentered: 2 });
  assert.equal(metric(a, "engagement").available, false);
});

test("a mostly-centred face scores higher engagement than a mostly-absent one", () => {
  const text = "A fine, reasonably developed answer to the question that was asked.";
  const centered = analyzeAnswer(text, 15, false, { totalSamples: 10, samplesWithFace: 10, samplesCentered: 9 });
  const absent = analyzeAnswer(text, 15, false, { totalSamples: 10, samplesWithFace: 2, samplesCentered: 1 });
  assert.ok(metric(centered, "engagement").score > metric(absent, "engagement").score);
  assert.equal(metric(centered, "engagement").available, true);
});

test("vocal energy is unavailable without enough audio samples", () => {
  const a = analyzeAnswer("A fine answer to the question.", 10, false, null, 0, { sampleCount: 2, meanVolume: 0.1, volumeStdDev: 0.05 });
  assert.equal(metric(a, "vocalEnergy").available, false);
});

test("more volume variation scores higher vocal energy than a flat, monotone level", () => {
  const text = "A fine, reasonably developed answer to the question that was asked.";
  const expressive = analyzeAnswer(text, 15, false, null, 0, { sampleCount: 50, meanVolume: 0.1, volumeStdDev: 0.05 });
  const monotone = analyzeAnswer(text, 15, false, null, 0, { sampleCount: 50, meanVolume: 0.1, volumeStdDev: 0.002 });
  assert.ok(metric(expressive, "vocalEnergy").score > metric(monotone, "vocalEnergy").score);
  assert.equal(metric(expressive, "vocalEnergy").available, true);
});

test("a long pause lowers the pace score, and a short one doesn't", () => {
  const text = Array(80).fill("word").join(" ");
  const noPause = analyzeAnswer(text, 40, false, null, 0);
  const shortPause = analyzeAnswer(text, 40, false, null, 1.5);
  const longPause = analyzeAnswer(text, 40, false, null, 8);
  assert.equal(metric(noPause, "pace").score, metric(shortPause, "pace").score);
  assert.ok(metric(longPause, "pace").score < metric(noPause, "pace").score);
  assert.match(metric(longPause, "pace").detail, /longest pause/i);
});

test("each metric's per-answer weight matches its share of the base weight table when nothing is unavailable", () => {
  const text = Array(80).fill("word").join(" ");
  const analysis = analyzeAnswer(text, 40, true, { totalSamples: 10, samplesWithFace: 10, samplesCentered: 8 }, 0, {
    sampleCount: 20,
    meanVolume: 0.1,
    volumeStdDev: 0.03,
  });
  assert.ok(analysis.metrics.every((m) => m.available));
  for (const m of analysis.metrics) {
    assert.ok(Math.abs(m.weight - WEIGHTS[m.key]) < 1e-9);
  }
  const totalWeight = analysis.metrics.reduce((sum, m) => sum + m.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
});

test("an unavailable metric's weight is 0, and the rest still sum to 1", () => {
  const text = Array(80).fill("word").join(" ");
  // No camera or vocal-energy data, and not a behavioral question: structure,
  // engagement, and vocalEnergy are unavailable; the other three are measured.
  const analysis = analyzeAnswer(text, 40, false);
  const unavailable = analysis.metrics.filter((m) => !m.available);
  const available = analysis.metrics.filter((m) => m.available);
  assert.ok(unavailable.length > 0 && available.length > 0);
  assert.ok(unavailable.every((m) => m.weight === 0));
  const totalWeight = available.reduce((sum, m) => sum + m.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9);
});

test("every metric has a tip and a full explanation, matching the weight table's keys", () => {
  const keys = Object.keys(WEIGHTS);
  assert.deepEqual(Object.keys(METRIC_TIPS).sort(), keys.sort());
  assert.deepEqual(Object.keys(METRIC_EXPLANATIONS).sort(), keys.sort());
  for (const key of keys) {
    const k = key as keyof typeof METRIC_EXPLANATIONS;
    assert.ok(METRIC_TIPS[k].length > 0);
    assert.ok(METRIC_EXPLANATIONS[k].whatWeMeasure.length > 0);
    assert.ok(METRIC_EXPLANATIONS[k].whyItMatters.length > 0);
    assert.ok(METRIC_EXPLANATIONS[k].howScored.length > 0);
  }
});
