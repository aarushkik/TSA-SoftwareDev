import { test } from "node:test";
import assert from "node:assert/strict";
import { hintFor } from "./hints.ts";
import type { Profile } from "./profile.ts";
import type { Question } from "./types.ts";

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    text: "Test question",
    category: "behavioral",
    difficulty: "beginner",
    jobTypes: ["general"],
    starRelevant: true,
    ...overrides,
  };
}

test("a general or technical question gets its category hint with no profile mention", () => {
  const general = hintFor(makeQuestion({ category: "general" }), null);
  assert.match(general, /specific/i);
  assert.ok(!general.includes("draw on"));

  const technical = hintFor(makeQuestion({ category: "technical" }), null);
  assert.match(technical, /think out loud/i);
});

test("a behavioral question with no profile experiences gets only the STAR hint", () => {
  const hint = hintFor(makeQuestion({ category: "behavioral" }), { targetRole: "", targetCompany: "", experiences: [] });
  assert.match(hint, /STAR/);
  assert.ok(!hint.includes("draw on"));
});

test("a behavioral question with profile experiences suggests one of them", () => {
  const profile: Profile = {
    targetRole: "Software Engineer",
    targetCompany: "Acme",
    experiences: [{ id: "e1", text: "Led a capstone project team of four" }],
  };
  const hint = hintFor(makeQuestion({ category: "behavioral" }), profile);
  assert.match(hint, /draw on one of your own experiences/i);
  assert.match(hint, /Led a capstone project team of four/);
});

test("a non-behavioral question never suggests a profile experience", () => {
  const profile: Profile = {
    targetRole: "",
    targetCompany: "",
    experiences: [{ id: "e1", text: "Led a capstone project team of four" }],
  };
  const hint = hintFor(makeQuestion({ category: "technical" }), profile);
  assert.ok(!hint.includes("draw on"));
});
