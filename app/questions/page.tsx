"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import {
  addCustomQuestion,
  getCustomQuestions,
  getCustomQuestionsServerSnapshot,
  removeCustomQuestion,
  subscribeCustomQuestions,
} from "@/lib/customQuestions";
import { allQuestions } from "@/lib/questions";
import {
  CATEGORY_LABELS_BASE,
  DIFFICULTY_LABELS,
  JOB_TYPE_LABELS,
  type CategoryFilter,
  type Difficulty,
  type JobType,
  type QuestionCategory,
} from "@/lib/types";

const JOB_FILTERS: (JobType | "all")[] = ["all", "general", "technology", "business", "customer_service", "creative"];
const CATEGORY_FILTERS: CategoryFilter[] = ["all", "general", "behavioral", "technical"];
const DIFFICULTY_FILTERS: (Difficulty | "all")[] = ["all", "beginner", "intermediate", "advanced"];
const JOB_TYPE_OPTIONS = Object.keys(JOB_TYPE_LABELS) as JobType[];

export default function QuestionsPage() {
  const customQuestions = useSyncExternalStore(
    subscribeCustomQuestions,
    getCustomQuestions,
    getCustomQuestionsServerSnapshot,
  );
  const [jobFilter, setJobFilter] = useState<JobType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<QuestionCategory>("general");
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>("beginner");
  const [newJobTypes, setNewJobTypes] = useState<JobType[]>(["general"]);

  const all = useMemo(() => allQuestions(customQuestions), [customQuestions]);
  const customIds = useMemo(() => new Set(customQuestions.map((q) => q.id)), [customQuestions]);

  const filtered = all.filter((q) => {
    if (jobFilter !== "all" && !q.jobTypes.includes(jobFilter) && !q.jobTypes.includes("general")) return false;
    if (categoryFilter !== "all" && q.category !== categoryFilter) return false;
    if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
    if (search.trim() && !q.text.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  function toggleNewJobType(type: JobType) {
    setNewJobTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function handleAddQuestion() {
    const text = newText.trim();
    if (!text || newJobTypes.length === 0) return;
    addCustomQuestion({
      text,
      category: newCategory,
      difficulty: newDifficulty,
      jobTypes: newJobTypes,
      starRelevant: newCategory === "behavioral",
    });
    setNewText("");
    setNewCategory("general");
    setNewDifficulty("beginner");
    setNewJobTypes(["general"]);
    setFormOpen(false);
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-900">Question bank</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Browse every question Interview Coach can ask, or add your own to practice something specific — like a
          question you know is coming up in a real interview.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value as JobType | "all")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-600"
          >
            {JOB_FILTERS.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "Any role" : JOB_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-600"
          >
            {CATEGORY_FILTERS.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "Any category" : CATEGORY_LABELS_BASE[c]}
              </option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as Difficulty | "all")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-600"
          >
            {DIFFICULTY_FILTERS.map((d) => (
              <option key={d} value={d}>
                {d === "all" ? "Any difficulty" : DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-teal-600"
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {filtered.length} question{filtered.length === 1 ? "" : "s"}
        </p>

        <ul className="mt-2 space-y-2">
          {filtered.map((q) => (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{q.text}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/?practice=${encodeURIComponent(q.id)}`}
                    className="whitespace-nowrap rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 transition hover:bg-teal-100 active:scale-[0.98]"
                  >
                    Practice this
                  </Link>
                  {customIds.has(q.id) && (
                    <button
                      type="button"
                      onClick={() => removeCustomQuestion(q.id)}
                      aria-label="Delete custom question"
                      title="Delete"
                      className="rounded-lg p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {DIFFICULTY_LABELS[q.difficulty]}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {CATEGORY_LABELS_BASE[q.category]}
                </span>
                {customIds.has(q.id) && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                    Your question
                  </span>
                )}
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              No questions match those filters.
            </li>
          )}
        </ul>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          {!formOpen ? (
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:border-teal-400 hover:text-teal-700 active:scale-[0.98]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add your own question
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">Add your own question</p>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={2}
                placeholder="e.g. Why do you want to intern with our team specifically?"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as QuestionCategory)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-600"
                >
                  {(["general", "behavioral", "technical"] as QuestionCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS_BASE[c]}
                    </option>
                  ))}
                </select>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-teal-600"
                >
                  {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Applies to</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {JOB_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleNewJobType(type)}
                      aria-pressed={newJobTypes.includes(type)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition active:scale-[0.98] ${
                        newJobTypes.includes(type)
                          ? "border-teal-600 bg-teal-50 text-teal-800"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {JOB_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={!newText.trim() || newJobTypes.length === 0}
                  className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Save question
                </button>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
