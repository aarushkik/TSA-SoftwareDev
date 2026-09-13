"use client";

import { useEffect, useState } from "react";
import AnswerFeedback from "@/components/AnswerFeedback";
import QuestionCard from "@/components/QuestionCard";
import ScenarioPicker from "@/components/ScenarioPicker";
import SessionSummary from "@/components/SessionSummary";
import { analyzeAnswer, buildWeights } from "@/lib/analysis";
import { getCustomQuestions } from "@/lib/customQuestions";
import { findQuestionById, pickNextQuestion } from "@/lib/questions";
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
  const [examMode, setExamMode] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [askedIds, setAskedIds] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [lastAnswered, setLastAnswered] = useState<AnsweredQuestion | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  // Captured right before each answer's difficulty adjustment, so a retry
  // can undo that shift instead of compounding two adjustments for one question.
  const [difficultyBeforeAnswer, setDifficultyBeforeAnswer] = useState<Difficulty>("beginner");

  // A "Practice this" link from the question browser (?practice=<id>) drops
  // straight into a single-question session for that exact question.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const practiceId = params.get("practice");
    if (!practiceId) return;
    window.history.replaceState(null, "", window.location.pathname);
    const question = findQuestionById(practiceId, getCustomQuestions());
    if (!question) return;
    queueMicrotask(() => {
      setJobType(question.jobTypes[0] ?? "general");
      setQuestionCount(1);
      setCameraEnabled(false);
      setCategory("all");
      setPriority(null);
      setFixedDifficulty(question.difficulty);
      setReadAloud(false);
      setExamMode(false);
      setDifficulty(question.difficulty);
      setAskedIds(new Set([question.id]));
      setAnswers([]);
      setCurrentQuestion(question);
      setPhase("asking");
    });
  }, []);

  function handleStart(options: StartOptions) {
    const startDifficulty: Difficulty = options.fixedDifficulty ?? "beginner";
    const first = pickNextQuestion(options.jobType, startDifficulty, new Set(), options.category, getCustomQuestions());
    if (!first) return;

    setJobType(options.jobType);
    setQuestionCount(options.questionCount);
    setCameraEnabled(options.cameraEnabled);
    setCategory(options.category);
    setPriority(options.priority);
    setFixedDifficulty(options.fixedDifficulty);
    setReadAloud(options.readAloud);
    setExamMode(options.examMode);
    setDifficulty(startDifficulty);
    setAskedIds(new Set([first.id]));
    setAnswers([]);
    setCurrentQuestion(first);
    setPhase("asking");
  }

  function finishSession(finalAnswers: AnsweredQuestion[]) {
    const overallScore = Math.round(
      finalAnswers.reduce((sum, a) => sum + a.analysis.overallScore, 0) / finalAnswers.length,
    );
    const session: SessionRecord = {
      id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      completedAt: new Date().toISOString(),
      jobType,
      answers: finalAnswers,
      overallScore,
    };
    saveSession(session);
    setAnswers(finalAnswers);
    setLastSessionId(session.id);
    setPhase("summary");
  }

  /** Shared by the "Next" button (normal mode) and exam mode's auto-advance. */
  function advance(updatedAnswers: AnsweredQuestion[], currentDifficulty: Difficulty) {
    if (updatedAnswers.length >= questionCount) {
      finishSession(updatedAnswers);
      return;
    }
    const next = pickNextQuestion(jobType, currentDifficulty, askedIds, category, getCustomQuestions());
    if (!next) {
      // Ran out of unique questions for this scenario — end the session early.
      finishSession(updatedAnswers);
      return;
    }
    setAskedIds((prev) => new Set(prev).add(next.id));
    setCurrentQuestion(next);
    setAnswers(updatedAnswers);
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
    const updatedAnswers = [...answers, answered];

    setDifficultyBeforeAnswer(difficulty);
    // A fixed difficulty means every question in the session stays at that
    // tier — no adaptive movement to undo.
    const newDifficulty = fixedDifficulty === null ? nextDifficulty(difficulty, analysis.overallScore) : difficulty;
    setDifficulty(newDifficulty);

    if (examMode) {
      advance(updatedAnswers, newDifficulty);
      return;
    }
    setAnswers(updatedAnswers);
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
    advance(answers, difficulty);
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
          <SessionSummary
            jobType={jobType}
            answers={answers}
            overallScore={overallScore}
            sessionId={lastSessionId}
            onPracticeAgain={handlePracticeAgain}
          />
        )}
      </div>
    </main>
  );
}
