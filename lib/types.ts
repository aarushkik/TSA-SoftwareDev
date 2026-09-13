/** Shared types for Interview Coach. Kept deliberately small. */

export type JobType = "general" | "technology" | "business" | "customer_service" | "creative";

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  general: "General / Any field",
  technology: "Technology",
  business: "Business",
  customer_service: "Customer Service",
  creative: "Creative",
};

export type Difficulty = "beginner" | "intermediate" | "advanced";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Consistent color coding for difficulty across the app — teal/amber/rose from easiest to hardest. */
export const DIFFICULTY_BADGE_CLASSES: Record<Difficulty, string> = {
  beginner: "bg-teal-50 text-teal-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced: "bg-rose-50 text-rose-700",
};

export type QuestionCategory = "general" | "behavioral" | "technical";
export type CategoryFilter = QuestionCategory | "all";

export const CATEGORY_LABELS_BASE: Record<QuestionCategory, string> = {
  general: "General",
  behavioral: "Behavioral",
  technical: "Technical",
};

export const METRIC_LABELS: Record<Metric["key"], string> = {
  communication: "Response substance",
  pace: "Speaking pace",
  fillerControl: "Filler word control",
  structure: "Answer structure",
  engagement: "Eye contact & engagement",
  vocalEnergy: "Vocal energy",
};

export type Question = {
  id: string;
  text: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  /** Which job types this question applies to; "general" applies to all. */
  jobTypes: JobType[];
  /** Behavioral questions are the ones STAR-structure detection applies to. */
  starRelevant: boolean;
  /** Shown to the user as a realistic follow-up after a strong answer, at advanced difficulty. */
  followUp?: string;
};

/** One measured sub-score behind the overall score — always shown with the raw numbers that produced it. */
export type Metric = {
  key: "communication" | "pace" | "fillerControl" | "structure" | "engagement" | "vocalEnergy";
  label: string;
  /** 0-100, higher is better. */
  score: number;
  /** Human sentence built from the same numbers that produced the score. */
  detail: string;
  available: boolean;
  /**
   * This metric's exact share (0-1) of THIS answer's overall score, after
   * redistributing the weight of any unavailable metrics. Always 0 when
   * unavailable. The available weights for one answer always sum to 1.
   */
  weight: number;
};

export type StarParts = {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
};

/** Raw counts from the browser-side face-detection loop — see useFaceEngagement. */
export type EngagementSummary = {
  totalSamples: number;
  samplesWithFace: number;
  samplesCentered: number;
};

/** Microphone volume samples from the browser-side audio loop — see useVocalEnergy. */
export type VocalEnergySummary = {
  sampleCount: number;
  meanVolume: number;
  volumeStdDev: number;
};

export type AnswerAnalysis = {
  transcript: string;
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  fillerWords: string[];
  longestPauseSeconds: number;
  starParts: StarParts | null;
  /** The exact phrase that triggered each detected STAR part, for parts where one was found. */
  starMatches: Partial<Record<keyof StarParts, string>> | null;
  metrics: Metric[];
  overallScore: number;
  /** A subjective 1-5 self-rating captured right after answering, before the measured score is compared to it. */
  selfRating?: number;
};

export type AnsweredQuestion = {
  question: Question;
  analysis: AnswerAnalysis;
};

export type SessionRecord = {
  id: string;
  completedAt: string;
  jobType: JobType;
  answers: AnsweredQuestion[];
  overallScore: number;
  /** A free-text reflection the user can attach after a session, e.g. "focus more on eye contact next time." */
  notes?: string;
  /** Whether this session was practiced in exam mode (feedback held until the end). */
  examMode?: boolean;
};

/** Everything chosen on the setup screen, bundled so the callback doesn't grow a new positional parameter per option. */
export type StartOptions = {
  jobType: JobType;
  questionCount: number;
  cameraEnabled: boolean;
  category: CategoryFilter;
  /** null = balanced weighting across every metric. */
  priority: Metric["key"] | null;
  /** null = adaptive difficulty, starting at beginner. */
  fixedDifficulty: Difficulty | null;
  readAloud: boolean;
  /** null = the browser's default voice. */
  voiceURI: string | null;
  /** Speech synthesis rate; 1 is normal speed. */
  speechRate: number;
  /** Exam mode holds every answer's feedback until the session ends, for a more realistic simulation. */
  examMode: boolean;
  /** null = no limit; otherwise the answer auto-submits when this many seconds elapse. */
  timeLimitSeconds: number | null;
};
