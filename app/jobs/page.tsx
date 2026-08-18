"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadJobs() {
    setLoading(true);
    try {
      const col = collection(db, "jobs");
      let q = query(col);
      // simple client-side filtering (Firestore query composition for arrays is limited)
      const snap = await getDocs(q);
      let results = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      if (skillFilter) {
        const s = skillFilter.toLowerCase();
        results = results.filter((j) => (j.requiredSkills || []).some((rs: string) => rs.toLowerCase().includes(s)));
      }
      if (locationFilter) {
        const l = locationFilter.toLowerCase();
        results = results.filter((j) => (j.location || "").toLowerCase().includes(l));
      }
      setJobs(results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Jobs</h2>
          <Link href="/jobs/new" className="px-3 py-2 bg-indigo-600 text-white rounded">Post a job</Link>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <input placeholder="Filter by skill" value={skillFilter} onChange={(e)=>setSkillFilter(e.target.value)} className="border px-3 py-2 rounded" />
          <input placeholder="Filter by location" value={locationFilter} onChange={(e)=>setLocationFilter(e.target.value)} className="border px-3 py-2 rounded" />
          <button onClick={loadJobs} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply filters</button>
        </div>

        {loading ? <p>Loading…</p> : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-white rounded shadow p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{job.title}</h3>
                  <span className="text-sm text-gray-500">{job.location} • {job.employmentType}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{job.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-500">Skills: {(job.requiredSkills || []).join(", ")}</div>
                  <Link href={`/jobs/${job.id}`} className="text-indigo-600">View</Link>
                </div>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-gray-600">No jobs match your filters.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
