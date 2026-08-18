"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("full-time");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        requiredSkills: requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        location,
        employmentType,
        experienceLevel,
        salaryRange: { min: Number(salaryMin), max: Number(salaryMax) },
        status: "open",
        createdAt: new Date().toISOString(),
      } as any;

      await addDoc(collection(db, "jobs"), job);
      // clear saving state before navigation to avoid stuck button
      setSaving(false);
      router.push("/jobs");
    } catch (err: any) {
      console.error('Job post error:', err);
      setError(err.message || "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Create Job Posting</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="mt-1 block w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Required skills (comma separated)</label>
            <input value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Employment type</label>
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2">
                <option value="full-time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Experience level</label>
              <input value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" />
            </div>
            <div className="flex gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary min</label>
                <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} className="mt-1 block w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary max</label>
                <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(Number(e.target.value))} className="mt-1 block w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {saving ? "Posting…" : "Post job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
