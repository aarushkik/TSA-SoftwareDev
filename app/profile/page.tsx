"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { addCustomQuestion } from "@/lib/customQuestions";
import { parseJobPosting, questionsFromSkills } from "@/lib/jobPosting";
import {
  addProfileExperience,
  getProfile,
  getProfileServerSnapshot,
  removeProfileExperience,
  subscribeProfile,
  updateProfileBasics,
} from "@/lib/profile";

export default function ProfilePage() {
  const profile = useSyncExternalStore(subscribeProfile, getProfile, getProfileServerSnapshot);
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [newExperience, setNewExperience] = useState("");
  const [saved, setSaved] = useState(false);
  const [postingText, setPostingText] = useState("");
  const [parsedTitle, setParsedTitle] = useState("");
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [hasParsed, setHasParsed] = useState(false);
  const [tailorMessage, setTailorMessage] = useState<string | null>(null);

  // Seed the editable fields from storage once, on mount — after that the
  // inputs are locally controlled so re-renders from other store updates
  // (e.g. adding an experience) don't clobber in-progress typing.
  useEffect(() => {
    const current = getProfile();
    queueMicrotask(() => {
      setTargetRole(current.targetRole);
      setTargetCompany(current.targetCompany);
    });
  }, []);

  function handleSaveBasics() {
    updateProfileBasics(targetRole.trim(), targetCompany.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAddExperience() {
    const text = newExperience.trim();
    if (!text) return;
    addProfileExperience(text);
    setNewExperience("");
  }

  function handleParsePosting() {
    const result = parseJobPosting(postingText);
    setParsedTitle(result.title ?? "");
    setParsedSkills(result.skills);
    setSelectedSkills(new Set(result.skills));
    setHasParsed(true);
    setTailorMessage(null);
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  function handleApplyTailoring() {
    const chosen = parsedSkills.filter((s) => selectedSkills.has(s));
    if (parsedTitle.trim()) {
      updateProfileBasics(parsedTitle.trim(), targetCompany);
      setTargetRole(parsedTitle.trim());
    }
    for (const question of questionsFromSkills(chosen)) {
      addCustomQuestion(question);
    }
    setTailorMessage(
      chosen.length > 0
        ? `Added ${chosen.length} tailored question${chosen.length === 1 ? "" : "s"} to your question bank.`
        : "Updated your target role.",
    );
    setPostingText("");
    setParsedTitle("");
    setParsedSkills([]);
    setSelectedSkills(new Set());
    setHasParsed(false);
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="text-xl font-semibold text-slate-900">Your info</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Stored only in this browser — never uploaded anywhere. Used to personalize hints, like suggesting one of
          your own experiences for a behavioral question.
        </p>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-xs font-medium text-slate-600">What are you practicing for?</p>
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Target role, e.g. Software Engineering Intern"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600"
            />
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="Target company (optional)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-600"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveBasics}
            className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-[0.98]"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-xs font-medium text-slate-600">Your experiences</p>
          <p className="mt-1 text-[11px] text-slate-400">
            A few real stories you could tell — a project, a challenge, a time you led or failed at something. Hints
            for behavioral questions will occasionally suggest one of these to help you get started.
          </p>

          <ul className="mt-3 space-y-2">
            {profile.experiences.map((exp) => (
              <li key={exp.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 p-2.5">
                <p className="text-xs text-slate-700">{exp.text}</p>
                <button
                  type="button"
                  onClick={() => removeProfileExperience(exp.id)}
                  aria-label="Remove experience"
                  className="shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
            {profile.experiences.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                No experiences added yet.
              </li>
            )}
          </ul>

          <div className="mt-3 flex gap-2">
            <textarea
              value={newExperience}
              onChange={(e) => setNewExperience(e.target.value)}
              rows={2}
              placeholder="e.g. Organized a school fundraiser that raised $2,000 despite a last-minute venue change"
              className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-teal-600"
            />
          </div>
          <button
            type="button"
            onClick={handleAddExperience}
            disabled={!newExperience.trim()}
            className="mt-2 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-teal-400 hover:text-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add experience
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <p className="text-xs font-medium text-slate-600">Tailor to a job posting</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            There&apos;s no LinkedIn connection here — LinkedIn doesn&apos;t offer a public API for pulling job
            postings, and scraping one would break their terms of service. Instead, paste the posting text (from
            LinkedIn or anywhere else) and this runs entirely in your browser: a title guess and a fixed list of
            recognized skills, both shown to you before anything is saved.
          </p>

          <textarea
            value={postingText}
            onChange={(e) => setPostingText(e.target.value)}
            rows={5}
            placeholder="Paste the full job posting text here…"
            className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-teal-600"
          />
          <button
            type="button"
            onClick={handleParsePosting}
            disabled={!postingText.trim()}
            className="mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Extract details
          </button>

          {hasParsed && (
            <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
              <div>
                <label htmlFor="parsed-title" className="text-[11px] font-medium text-slate-500">
                  Role title (edit if this guess is off)
                </label>
                <input
                  id="parsed-title"
                  type="text"
                  value={parsedTitle}
                  onChange={(e) => setParsedTitle(e.target.value)}
                  placeholder="Couldn't guess a title — type one in"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none placeholder:text-slate-400 focus:border-teal-600"
                />
              </div>

              {parsedSkills.length > 0 ? (
                <div>
                  <p className="text-[11px] font-medium text-slate-500">
                    Skills found — each becomes a tailored practice question
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {parsedSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        aria-pressed={selectedSkills.has(skill)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition active:scale-[0.98] ${
                          selectedSkills.has(skill)
                            ? "border-teal-600 bg-teal-50 text-teal-800"
                            : "border-slate-200 text-slate-400 line-through hover:border-slate-300"
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No recognized skill keywords found in that text.</p>
              )}

              <button
                type="button"
                onClick={handleApplyTailoring}
                className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700 transition hover:bg-teal-100 active:scale-[0.98]"
              >
                Apply
              </button>
            </div>
          )}

          {tailorMessage && (
            <p className="mt-2 text-[11px] text-teal-700">
              {tailorMessage}{" "}
              <Link href="/questions" className="font-medium underline">
                View question bank
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
