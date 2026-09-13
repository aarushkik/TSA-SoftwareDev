import { test } from "node:test";
import assert from "node:assert/strict";
import { isSessionRecord } from "./sessions.ts";

const validSession = {
  id: "s1",
  completedAt: new Date().toISOString(),
  jobType: "general",
  answers: [],
  overallScore: 80,
};

test("isSessionRecord accepts a well-formed session", () => {
  assert.equal(isSessionRecord(validSession), true);
});

test("isSessionRecord rejects non-objects and objects missing required fields", () => {
  assert.equal(isSessionRecord(null), false);
  assert.equal(isSessionRecord("not a session"), false);
  assert.equal(isSessionRecord({ ...validSession, answers: "not an array" }), false);
  assert.equal(isSessionRecord({ ...validSession, overallScore: "80" }), false);
  const withoutId: Record<string, unknown> = { ...validSession };
  delete withoutId.id;
  assert.equal(isSessionRecord(withoutId), false);
});
