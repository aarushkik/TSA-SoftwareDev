import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, pickNextQuestion, questionsFor } from "./questions.ts";
import { JOB_TYPE_LABELS } from "./types.ts";
import type { Difficulty, JobType } from "./types.ts";

test("every question has a unique id", () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every job type has at least one question at every difficulty", () => {
  const jobTypes = Object.keys(JOB_TYPE_LABELS) as JobType[];
  const difficulties: Difficulty[] = ["beginner", "intermediate", "advanced"];
  for (const jobType of jobTypes) {
    for (const difficulty of difficulties) {
      const pool = questionsFor(jobType, difficulty);
      assert.ok(pool.length > 0, `expected at least one ${difficulty} question for ${jobType}`);
    }
  }
});

test("pickNextQuestion never repeats a question already asked in the session", () => {
  const asked = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const next = pickNextQuestion("technology", "intermediate", asked);
    assert.ok(next, "expected a question to still be available");
    assert.ok(!asked.has(next.id));
    asked.add(next.id);
  }
});

test("pickNextQuestion falls back to another tier once a tier is exhausted", () => {
  const beginnerIds = new Set(questionsFor("customer_service", "beginner").map((q) => q.id));
  const next = pickNextQuestion("customer_service", "beginner", beginnerIds);
  assert.ok(next, "expected a fallback question from another tier");
  assert.ok(!beginnerIds.has(next.id));
});
