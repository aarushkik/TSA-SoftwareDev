import type { Profile } from "./profile";
import type { Question, QuestionCategory } from "./types";

/** A technique tip for approaching this type of question — shown before or during answering, not a scored signal. */
const CATEGORY_HINTS: Record<QuestionCategory, string> = {
  general:
    "Keep it focused and specific — a couple of concrete sentences beat a vague generality. Tie your answer back to why it makes you a good fit.",
  behavioral:
    "Structure your answer with STAR: briefly set the Situation, state the Task you needed to do, describe the Action you personally took, then the Result. Aim for 30-90 seconds.",
  technical:
    "Think out loud — walk through your reasoning step by step rather than jumping straight to a conclusion. It's fine to mention trade-offs you considered.",
};

/**
 * A pre-answer hint for this question: a general technique tip, plus (if the
 * user has added their own experiences) a suggestion to draw on one of them.
 * Never invents an answer — only points toward how to structure one.
 */
export function hintFor(question: Question, profile: Profile | null): string {
  const base = CATEGORY_HINTS[question.category];
  if (question.category !== "behavioral" || !profile || profile.experiences.length === 0) return base;
  const experience = profile.experiences[Math.floor(Math.random() * profile.experiences.length)];
  return `${base} You could draw on one of your own experiences: "${experience.text}"`;
}
