import type { JobType, SessionRecord } from "./types";

export type Achievement = {
  id: string;
  label: string;
  description: string;
  check: (sessions: SessionRecord[]) => boolean;
};

const dayKey = (iso: string) => new Date(iso).toDateString();

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-session",
    label: "First Steps",
    description: "Complete your first practice session",
    check: (sessions) => sessions.length >= 1,
  },
  {
    id: "five-sessions",
    label: "Regular Practice",
    description: "Complete 5 practice sessions",
    check: (sessions) => sessions.length >= 5,
  },
  {
    id: "ten-sessions",
    label: "Dedicated",
    description: "Complete 10 practice sessions",
    check: (sessions) => sessions.length >= 10,
  },
  {
    id: "high-score",
    label: "Excellent Answer",
    description: "Score 90 or higher in a session",
    check: (sessions) => sessions.some((s) => s.overallScore >= 90),
  },
  {
    id: "filler-free",
    label: "Filler-Free",
    description: "Answer a question with zero filler words",
    check: (sessions) => sessions.some((s) => s.answers.some((a) => a.analysis.fillerWordCount === 0)),
  },
  {
    id: "star-master",
    label: "STAR Master",
    description: "Hit all four STAR parts in a behavioral answer",
    check: (sessions) =>
      sessions.some((s) =>
        s.answers.some((a) => a.analysis.starParts && Object.values(a.analysis.starParts).every(Boolean)),
      ),
  },
  {
    id: "well-rounded",
    label: "Well-Rounded",
    description: "Practice a session in every job category",
    check: (sessions) => new Set(sessions.map((s) => s.jobType)).size >= 5,
  },
  {
    id: "three-day-streak",
    label: "On a Roll",
    description: "Practice on 3 different days",
    check: (sessions) => new Set(sessions.map((s) => dayKey(s.completedAt))).size >= 3,
  },
  {
    id: "advanced-reached",
    label: "Leveled Up",
    description: "Answer an advanced-difficulty question",
    check: (sessions) => sessions.some((s) => s.answers.some((a) => a.question.difficulty === "advanced")),
  },
  {
    id: "exam-mode",
    label: "Under Pressure",
    description: "Complete a session in exam mode",
    check: (sessions) => sessions.some((s) => s.examMode === true),
  },
  {
    id: "own-question",
    label: "Question Creator",
    description: "Practice with a question you wrote yourself",
    check: (sessions) => sessions.some((s) => s.answers.some((a) => a.question.id.startsWith("custom-"))),
  },
  {
    id: "well-calibrated",
    label: "Well-Calibrated",
    description: "Rate yourself within 10 points of your actual score three times",
    check: (sessions) => {
      let count = 0;
      for (const s of sessions) {
        for (const a of s.answers) {
          if (a.analysis.selfRating !== undefined && Math.abs(a.analysis.overallScore - a.analysis.selfRating * 20) <= 10) {
            count += 1;
          }
        }
      }
      return count >= 3;
    },
  },
];

export function unlockedAchievements(sessions: SessionRecord[]): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check(sessions));
}

/** Consecutive days up to and including today with at least one completed session. */
export function currentStreakDays(sessions: SessionRecord[]): number {
  const days = new Set(sessions.map((s) => dayKey(s.completedAt)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** How many of the five job types have at least one saved session. Used by the "Well-Rounded" progress hint. */
export function jobTypesCovered(sessions: SessionRecord[]): Set<JobType> {
  return new Set(sessions.map((s) => s.jobType));
}
