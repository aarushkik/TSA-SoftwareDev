import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJobPosting, questionsFromSkills } from "./jobPosting.ts";

test("an empty posting parses to no title and no skills", () => {
  const result = parseJobPosting("   ");
  assert.equal(result.title, null);
  assert.deepEqual(result.skills, []);
});

test("a short first line is treated as the title guess", () => {
  const result = parseJobPosting("Software Engineering Intern\n\nWe are looking for a motivated student...");
  assert.equal(result.title, "Software Engineering Intern");
});

test("a first line that reads like a sentence is not treated as a title", () => {
  const result = parseJobPosting("We are a fast-growing startup looking for talented engineers to join our team.");
  assert.equal(result.title, null);
});

test("skill keywords are matched as whole words, case-insensitively", () => {
  const result = parseJobPosting("Looking for someone with strong Python and SQL skills, plus experience with react.");
  assert.ok(result.skills.includes("Python"));
  assert.ok(result.skills.includes("SQL"));
  assert.ok(result.skills.includes("React"));
});

test("skill keywords don't false-positive on partial word matches", () => {
  // "Java" and "JavaScript" are separate keywords — word-boundary matching
  // must not credit "Java" just because "JavaScript" appears in the text.
  const result = parseJobPosting("Experience with JavaScript required.");
  assert.ok(result.skills.includes("JavaScript"));
  assert.ok(!result.skills.includes("Java"));
});

test("questionsFromSkills builds one behavioral, STAR-relevant question per skill", () => {
  const questions = questionsFromSkills(["Python", "SQL"], "technology");
  assert.equal(questions.length, 2);
  for (const q of questions) {
    assert.equal(q.category, "behavioral");
    assert.equal(q.starRelevant, true);
    assert.deepEqual(q.jobTypes, ["technology"]);
  }
  assert.match(questions[0].text, /Python/);
  assert.match(questions[1].text, /SQL/);
});
