"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

type RequiredSkill = {
  skill: string;
  importance: "must-have" | "nice-to-have";
};

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<RequiredSkill[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [atsEnabled, setAtsEnabled] = useState(true);
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addSkill() {
    const skill = skillInput.trim();
    if (!skill || requiredSkills.some((item) => item.skill.toLowerCase() === skill.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setRequiredSkills((current) => [...current, { skill, importance: "must-have" }]);
    setSkillInput("");
  }

  function removeSkill(skillToRemove: string) {
    setRequiredSkills((current) => current.filter((item) => item.skill !== skillToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in as a recruiter to post a job.");

      const job = {
        recruiterId: user.uid,
        title,
        description,
        requiredSkills,
        atsEnabled,
        location,
        employmentType,
        experienceLevel,
        salaryRange: { min: Number(salaryMin), max: Number(salaryMax) },
        status: "open",
        createdAt: new Date().toISOString(),
      } as any;

      await addDoc(collection(db, "jobs"), job);
      setSaving(false);
      router.push("/my-listings");
    } catch (err: any) {
      console.error("Job post error:", err);
      setError(err.message || "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Recruiter</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Create a job posting</h1>
          </div>
          <Link href="/my-listings" className="btn-secondary">
            My listings
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="input-field" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Required skills</label>
            <div className="mt-2 rounded-xl border border-slate-300 bg-white p-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((item) => (
                  <div key={item.skill} className="flex items-center gap-1 rounded-full bg-slate-100 pl-3 text-sm text-slate-700">
                    <span>{item.skill}</span>
                    <select
                      value={item.importance}
                      onChange={(event) => setRequiredSkills((current) => current.map((skill) => skill.skill === item.skill ? { ...skill, importance: event.target.value as RequiredSkill["importance"] } : skill))}
                      className="border-0 bg-transparent py-1 text-xs font-medium text-slate-600 focus:ring-0"
                      aria-label={`${item.skill} importance`}
                    >
                      <option value="must-have">Must-have</option>
                      <option value="nice-to-have">Nice-to-have</option>
                    </select>
                    <button type="button" onClick={() => removeSkill(item.skill)} className="px-2 text-slate-400 hover:text-red-600" aria-label={`Remove ${item.skill}`}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                value={skillInput}
                onChange={(event) => setSkillInput(event.target.value.replace(/,/g, ""))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addSkill();
                  }
                }}
                onPaste={(event) => event.preventDefault()}
                maxLength={60}
                placeholder={requiredSkills.length ? "Add another skill" : "Type one skill, then press Enter"}
                className="mt-2 w-full border-0 p-0 text-sm outline-none focus:ring-0"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Add one skill at a time with Enter or comma.</p>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" checked={atsEnabled} onChange={(event) => setAtsEnabled(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span>
              <span className="block font-medium text-slate-900">Enable ATS matching for this job</span>
              <span className="block text-xs text-slate-500">When disabled, applicants will not receive a match score.</span>
            </span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Employment type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="input-field">
                <option value="full-time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Experience level</label>
              <input value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="input-field" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Salary min</label>
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Salary max</label>
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(Number(e.target.value))} className="input-field" />
              </div>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Posting…" : "Post job"}
            </button>
            <Link href="/my-listings" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
