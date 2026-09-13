"use client";

import { useState } from "react";
import AnswerFeedback from "@/components/AnswerFeedback";
import QuestionCard from "@/components/QuestionCard";
import ScenarioPicker from "@/components/ScenarioPicker";
import SessionSummary from "@/components/SessionSummary";
import { analyzeAnswer, buildWeights } from "@/lib/analysis";
import { pickNextQuestion } from "@/lib/questions";
import { saveSession } from "@/lib/sessions";
import type {
  AnsweredQuestion,
  CategoryFilter,
  Difficulty,
  EngagementSummary,
  JobType,
  Metric,
  Question,
  SessionRecord,
  StartOptions,
  VocalEnergySummary,
} from "@/lib/types";

type Phase = "setup" | "asking" | "feedback" | "summary";

/** A strong answer moves difficulty up a tier; a weak one moves it back down. */
function nextDifficulty(current: Difficulty, score: number): Difficulty {
  const order: Difficulty[] = ["beginner", "intermediate", "advanced"];
  const index = order.indexOf(current);
  if (score >= 80) return order[Math.min(order.length - 1, index + 1)];
  if (score < 50) return order[Math.max(0, index - 1)];
  return current;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [jobType, setJobType] = useState<JobType>("general");
  const [questionCount, setQuestionCount] = useState(5);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [priority, setPriority] = useState<Metric["key"] | null>(null);
  const [fixedDifficulty, setFixedDifficulty] = useState<Difficulty | null>(null);
  const [readAloud, setReadAloud] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [lastAnswered, setLastAnswered] = useState<AnsweredQuestion | null>(null);
  // Captured right before each answer's difficulty adjustment, so a retry
  // can undo that shift instead of compounding two adjustments for one question.
  const [difficultyBeforeAnswer, setDifficultyBeforeAnswer] = useState<Difficulty>("beginner");

  function handleStart(options: StartOptions) {
    const startDifficulty: Difficulty = options.fixedDifficulty ?? "beginner";
    const first = pickNextQuestion(options.jobType, startDifficulty, new Set(), options.category);
    if (!first) return;

    setJobType(options.jobType);
    setQuestionCount(options.questionCount);
    setCameraEnabled(options.cameraEnabled);
    setCategory(options.category);
    setPriority(options.priority);
    setFixedDifficulty(options.fixedDifficulty);
    setReadAloud(options.readAloud);
    setDifficulty(startDifficulty);
    setAskedIds(new Set([first.id]));
    setAnswers([]);
    setCurrentQuestion(first);
    setPhase("asking");
  }

  function handleSubmitAnswer(
    transcript: string,
    durationSeconds: number,
    engagement: EngagementSummary | null,
    longestPauseSeconds: number,
    vocalEnergy: VocalEnergySummary | null,
  ) {
    if (!currentQuestion) return;
    const analysis = analyzeAnswer(
      transcript,
      durationSeconds,
      currentQuestion.starRelevant,
      engagement,
      longestPauseSeconds,
      vocalEnergy,
      buildWeights(priority),
    );
    const answered: AnsweredQuestion = { question: currentQuestion, analysis };

    setDifficultyBeforeAnswer(difficulty);
    setAnswers((prev) => [...prev, answered]);
    // A fixed difficulty means every question in the session stays at that
    // tier — no adaptive movement to undo.
    if (fixedDifficulty === null) {
      setDifficulty((d) => nextDifficulty(d, analysis.overallScore));
    }
    setLastAnswered(answered);
    setPhase("feedback");
  }

  /** Discards the last answer and re-asks the same question, undoing the difficulty shift it caused. */
  function handleRetry() {
    if (!currentQuestion) return;
    setAnswers((prev) => prev.slice(0, -1));
    setDifficulty(difficultyBeforeAnswer);
    setLastAnswered(null);
    setPhase("asking");
  }

  function handleNext() {
    if (answers.length >= questionCount) {
      const overallScore = Math.round(
        answers.reduce((sum, a) => sum + a.analysis.overallScore, 0) / answers.length,
      );
      const session: SessionRecord = {
        id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        completedAt: new Date().toISOString(),
        jobType,
        answers,
        overallScore,
      };
      saveSession(session);
      setPhase("summary");
      return;
    }

    const next = pickNextQuestion(jobType, difficulty, askedIds, category);
    if (!next) {
      // Ran out of unique questions for this scenario — end the session early.
      handleNext();
      return;
    }
    setAskedIds((prev) => new Set(prev).add(next.id));
    setCurrentQuestion(next);
    setPhase("asking");
  }

  function handlePracticeAgain() {
    setPhase("setup");
    setCurrentQuestion(null);
    setAnswers([]);
    setLastAnswered(null);
  }

  const overallScore = Math.round(
    answers.reduce((sum, a) => sum + a.analysis.overallScore, 0) / Math.max(1, answers.length),
  );

  return (
    <main className="flex-1 px-4 py-10">
      <div key={phase} className="animate-fade-in">
        {phase === "setup" && <ScenarioPicker onStart={handleStart} />}

        {phase === "asking" && currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionNumber={answers.length + 1}
            totalQuestions={questionCount}
            cameraEnabled={cameraEnabled}
            readAloud={readAloud}
            onSubmit={handleSubmitAnswer}
          />
        )}

        {phase === "feedback" && lastAnswered && (
          <AnswerFeedback
            answered={lastAnswered}
            isLastQuestion={answers.length >= questionCount}
            onNext={handleNext}
            onRetry={handleRetry}
          />
        )}

        {phase === "summary" && (
          <SessionSummary jobType={jobType} answers={answers} overallScore={overallScore} onPracticeAgain={handlePracticeAgain} />
        )}
      </div>
    </main>
  );
}
