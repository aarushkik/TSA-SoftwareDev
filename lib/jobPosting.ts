import type { JobType, Question } from "./types";

/**
 * A real LinkedIn connection would need OAuth credentials this app doesn't
 * have, and LinkedIn doesn't offer a public API for scraping job postings —
 * pulling one down directly would violate their terms of service. Instead,
 * you paste in the posting text yourself (from LinkedIn or anywhere else)
 * and this runs entirely in your browser: a title guess and a fixed list of
 * recognized skill keywords, both of which you can review before anything
 * is saved. Nothing here is ever uploaded or sent anywhere.
 */

const SKILL_KEYWORDS = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "SQL", "React", "Node.js",
  "AWS", "Azure", "Docker", "Kubernetes", "Git", "Linux", "machine learning", "data analysis",
  "Excel", "Salesforce", "Figma", "Photoshop", "Illustrator", "video editing",
  "project management", "Agile", "Scrum", "public speaking", "leadership",
  "customer service", "sales", "marketing", "social media", "SEO", "accounting",
  "budgeting", "negotiation", "writing", "editing", "research", "teaching",
];

export type ParsedJobPosting = {
  /** A best-effort guess at the role title from the first line — always shown as editable, never trusted blindly. */
  title: string | null;
  /** Recognized skill/tool keywords found in the posting text, via exact keyword matching only — never inferred. */
  skills: string[];
};

export function parseJobPosting(text: string): ParsedJobPosting {
  const trimmed = text.trim();
  if (!trimmed) return { title: null, skills: [] };

  const firstLine = trimmed
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  const title = firstLine && firstLine.length <= 80 && !firstLine.endsWith(".") ? firstLine : null;

  const skills = SKILL_KEYWORDS.filter((skill) => {
    const pattern = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return pattern.test(trimmed);
  });

  return { title, skills };
}

/** Template-based (not AI-generated) questions built from real skills found in a pasted posting. */
export function questionsFromSkills(skills: string[], jobType: JobType = "general"): Omit<Question, "id">[] {
  return skills.map((skill) => ({
    text: `Tell me about a time you used ${skill} to accomplish something you're proud of.`,
    category: "behavioral" as const,
    difficulty: "intermediate" as const,
    jobTypes: [jobType],
    starRelevant: true,
  }));
}
