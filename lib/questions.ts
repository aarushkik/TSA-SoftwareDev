import type { Difficulty, JobType, Question } from "./types";

export const QUESTIONS: Question[] = [
  // Beginner — general
  {
    id: "q-tell-me-about-yourself",
    text: "Tell me about yourself.",
    category: "general",
    difficulty: "beginner",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: false,
  },
  {
    id: "q-why-this-role",
    text: "Why are you interested in this position?",
    category: "general",
    difficulty: "beginner",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: false,
  },
  {
    id: "q-strengths",
    text: "What would you say is your greatest strength?",
    category: "general",
    difficulty: "beginner",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: false,
  },
  {
    id: "q-weakness",
    text: "What is something you're working to improve about yourself?",
    category: "general",
    difficulty: "beginner",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: false,
  },

  // Intermediate — behavioral (STAR-relevant)
  {
    id: "q-difficult-problem",
    text: "Tell me about a time you solved a difficult problem.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: true,
    followUp: "What would you do differently if you faced that same problem again today?",
  },
  {
    id: "q-teamwork",
    text: "Describe a time you worked as part of a team to accomplish a goal.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: true,
    followUp: "How did you handle a teammate who wasn't contributing equally?",
  },
  {
    id: "q-missed-deadline",
    text: "Tell me about a time you had to manage multiple priorities or a tight deadline.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["general", "business", "technology"],
    starRelevant: true,
  },
  {
    id: "q-mistake",
    text: "Describe a mistake you made at work or school and how you handled it.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: true,
  },
  {
    id: "q-customer-issue",
    text: "Tell me about a time you had to deal with a frustrated or upset customer.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["customer_service", "business"],
    starRelevant: true,
  },
  {
    id: "q-creative-constraint",
    text: "Describe a project where you had to be creative within a strict limitation, like budget or time.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["creative"],
    starRelevant: true,
  },
  {
    id: "q-debug-story",
    text: "Tell me about a time you had to track down and fix a difficult bug or technical issue.",
    category: "behavioral",
    difficulty: "intermediate",
    jobTypes: ["technology"],
    starRelevant: true,
  },

  // Advanced — behavioral with sharper follow-ups
  {
    id: "q-disagreement",
    text: "Tell me about a time you disagreed with a team member. How did you handle the situation?",
    category: "behavioral",
    difficulty: "advanced",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: true,
    followUp: "You mentioned you led that project. What was the most difficult decision you had to make as the leader?",
  },
  {
    id: "q-failure",
    text: "Tell me about a time you failed at something important. What did you learn?",
    category: "behavioral",
    difficulty: "advanced",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: true,
    followUp: "Looking back, what's one thing you wish you had done differently in the moment?",
  },
  {
    id: "q-influence-without-authority",
    text: "Describe a time you had to convince others to support an idea when you weren't formally in charge.",
    category: "behavioral",
    difficulty: "advanced",
    jobTypes: ["general", "business", "technology"],
    starRelevant: true,
  },
  {
    id: "q-ethical-dilemma",
    text: "Tell me about a time you faced an ethical dilemma or had to make a difficult judgment call.",
    category: "behavioral",
    difficulty: "advanced",
    jobTypes: ["general", "business", "technology", "customer_service"],
    starRelevant: true,
  },
  {
    id: "q-scaling-tradeoff",
    text: "Describe a situation where you had to choose between doing something quickly and doing it thoroughly.",
    category: "technical",
    difficulty: "advanced",
    jobTypes: ["technology"],
    starRelevant: true,
  },

  // General/technical closers
  {
    id: "q-questions-for-us",
    text: "Do you have any questions for me about the role or the company?",
    category: "general",
    difficulty: "beginner",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: false,
  },
  {
    id: "q-where-in-5-years",
    text: "Where do you see yourself in five years?",
    category: "general",
    difficulty: "beginner",
    jobTypes: ["general", "technology", "business", "customer_service", "creative"],
    starRelevant: false,
  },
];

export function questionsFor(jobType: JobType, difficulty: Difficulty): Question[] {
  return QUESTIONS.filter(
    (q) => q.difficulty === difficulty && (q.jobTypes.includes(jobType) || q.jobTypes.includes("general")),
  );
}

/** A question not already asked this session, preferring the requested difficulty and falling back one tier if that pool is empty. */
export function pickNextQuestion(jobType: JobType, difficulty: Difficulty, askedIds: Set<string>): Question | null {
  const tiers: Difficulty[] = difficulty === "advanced"
    ? ["advanced", "intermediate", "beginner"]
    : difficulty === "intermediate"
      ? ["intermediate", "beginner", "advanced"]
      : ["beginner", "intermediate", "advanced"];

  for (const tier of tiers) {
    const pool = questionsFor(jobType, tier).filter((q) => !askedIds.has(q.id));
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}
