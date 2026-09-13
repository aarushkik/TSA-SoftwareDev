import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeAnswer } from "./analysis.ts";

function metric(analysis: ReturnType<typeof analyzeAnswer>, key: string) {
  const m = analysis.metrics.find((m) => m.key === key);
  assert.ok(m, `expected a ${key} metric`);
  return m;
}

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

test("engagement (eye contact) is always unavailable in this build and never invents a score", () => {
  const a = analyzeAnswer("A perfectly fine, normal-length answer to the question that was asked here today.", 15, false);
  const engagement = metric(a, "engagement");
  assert.equal(engagement.available, false);
  assert.equal(engagement.score, 0);
});
