import { test } from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, currentStreakDays, unlockedAchievements } from "./achievements.ts";
import type { AnsweredQuestion, Question, SessionRecord } from "./types.ts";

function makeSession(overrides: Partial<SessionRecord> & { daysAgo?: number } = {}): SessionRecord {
  const { daysAgo = 0, ...rest } = overrides;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `s${Math.random()}`,
    completedAt: date.toISOString(),
    jobType: "general",
    answers: [],
    overallScore: 60,
    ...rest,
  };
}

function makeAnswer(overrides: Partial<AnsweredQuestion["analysis"]> & { question?: Partial<Question> } = {}): AnsweredQuestion {
  const { question, ...analysisOverrides } = overrides;
  return {
    question: {
      id: "q1",
      text: "Test question",
      category: "general",
      difficulty: "beginner",
      jobTypes: ["general"],
      starRelevant: false,
      ...question,
    },
    analysis: {
      transcript: "An answer",
      wordCount: 10,
      durationSeconds: 10,
      wordsPerMinute: 60,
      fillerWordCount: 0,
      fillerWords: [],
      longestPauseSeconds: 0,
      starParts: null,
      starMatches: null,
      metrics: [],
      overallScore: 60,
      ...analysisOverrides,
    },
  };
}

test("every achievement has a unique id", () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("no achievements unlock with no sessions", () => {
  assert.equal(unlockedAchievements([]).length, 0);
});

test("first session unlocks First Steps but not Regular Practice", () => {
  const unlocked = unlockedAchievements([makeSession()]).map((a) => a.id);
  assert.ok(unlocked.includes("first-session"));
  assert.ok(!unlocked.includes("five-sessions"));
});

test("a session with a zero-filler answer unlocks Filler-Free", () => {
  const session = makeSession({ answers: [makeAnswer({ fillerWordCount: 0 })] });
  const unlocked = unlockedAchievements([session]).map((a) => a.id);
  assert.ok(unlocked.includes("filler-free"));
});

test("a fully-detected STAR answer unlocks STAR Master", () => {
  const session = makeSession({
    answers: [makeAnswer({ starParts: { situation: true, task: true, action: true, result: true } })],
  });
  assert.ok(unlockedAchievements([session]).map((a) => a.id).includes("star-master"));
});

test("an exam-mode session unlocks Under Pressure", () => {
  const session = makeSession({ examMode: true });
  assert.ok(unlockedAchievements([session]).map((a) => a.id).includes("exam-mode"));
  const normalSession = makeSession({ examMode: false });
  assert.ok(!unlockedAchievements([normalSession]).map((a) => a.id).includes("exam-mode"));
});

test("answering a custom question unlocks Question Creator", () => {
  const session = makeSession({ answers: [makeAnswer({ question: { id: "custom-abc123" } })] });
  assert.ok(unlockedAchievements([session]).map((a) => a.id).includes("own-question"));
});

test("three well-calibrated self-ratings unlock Well-Calibrated", () => {
  const closeAnswer = () => makeAnswer({ overallScore: 80, selfRating: 4 }); // 4*20=80, gap 0
  const farAnswer = () => makeAnswer({ overallScore: 30, selfRating: 5 }); // 5*20=100, gap 70
  const session = makeSession({ answers: [closeAnswer(), closeAnswer(), closeAnswer()] });
  assert.ok(unlockedAchievements([session]).map((a) => a.id).includes("well-calibrated"));

  const uncalibrated = makeSession({ answers: [farAnswer(), farAnswer(), farAnswer()] });
  assert.ok(!unlockedAchievements([uncalibrated]).map((a) => a.id).includes("well-calibrated"));
});

test("currentStreakDays counts consecutive days ending today, and stops at a gap", () => {
  const consecutive = [makeSession({ daysAgo: 0 }), makeSession({ daysAgo: 1 }), makeSession({ daysAgo: 2 })];
  assert.equal(currentStreakDays(consecutive), 3);

  const withGap = [makeSession({ daysAgo: 0 }), makeSession({ daysAgo: 2 })];
  assert.equal(currentStreakDays(withGap), 1);

  assert.equal(currentStreakDays([]), 0);
});
