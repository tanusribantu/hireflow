"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import Link from "next/link";
import { LoadingCardList } from "../components/LoadingSkeleton";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [applicationFilter, setApplicationFilter] = useState<"all" | "applied" | "not-applied">("all");
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      const applicationIds = new Set<string>();
      if (currentUser) {
        const token = await currentUser.getIdToken();
        const applicationsResponse = await fetch("/api/applications/my-applications", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const applicationsData = await applicationsResponse.json();
        if (!applicationsResponse.ok) throw new Error(applicationsData.error || "Unable to load application status");
        (applicationsData.applications || []).forEach((application: any) => applicationIds.add(application.jobId));
      }

      const col = collection(db, "jobs");
      const snap = await getDocs(query(col));
      let results = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
      setAppliedJobIds(applicationIds);

      if (skillFilter) {
        const s = skillFilter.toLowerCase();
        results = results.filter((j) => (j.requiredSkills || []).some((rs: string) => rs.toLowerCase().includes(s)));
      }
      if (locationFilter) {
        const l = locationFilter.toLowerCase();
        results = results.filter((j) => (j.location || "").toLowerCase().includes(l));
      }
      if (applicationFilter === "applied") results = results.filter((job) => applicationIds.has(job.id));
      if (applicationFilter === "not-applied") results = results.filter((job) => !applicationIds.has(job.id));

      setJobs(results);
    } catch (loadError: any) {
      console.error("Failed to load jobs:", loadError);
      setError(loadError.message || "Unable to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => loadJobs());
    return () => unsubscribe();
  }, [applicationFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Candidate</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Browse jobs</h1>
        </div>
        <Link href="/applications" className="btn-secondary">
          My applications
        </Link>
      </div>

      <div className="card">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]">
          <input
            placeholder="Filter by skill"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="input-field"
          />
          <input
            placeholder="Filter by location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="input-field"
          />
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 md:col-span-2">
            {(["all", "applied", "not-applied"] as const).map((filter) => (
              <button key={filter} type="button" onClick={() => setApplicationFilter(filter)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${applicationFilter === filter ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}>
                {filter === "all" ? "All Jobs" : filter === "applied" ? "Applied" : "Not Applied"}
              </button>
            ))}
          </div>
          <button onClick={loadJobs} className="btn-primary">
            Apply filters
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingCardList count={4} />
      ) : error ? (
        <div className="card text-center"><p className="text-red-600">{error}</p></div>
      ) : jobs.length === 0 ? (
        <div className="card text-center">
          <h2 className="text-xl font-semibold text-slate-900">No roles match your filters</h2>
          <p className="mt-2 text-slate-600">Try broadening your search or come back later when new roles are posted.</p>
          <div className="mt-5 flex justify-center">
            <button type="button" onClick={() => { setSkillFilter(""); setLocationFilter(""); loadJobs(); }} className="btn-secondary">
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="card transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{job.location} • {job.employmentType}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">{job.status || "Open"}</span>
              </div>

              <p className="mt-4 text-slate-700">{job.description}</p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(job.requiredSkills || []).map((skill: string) => (
                    <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>
                  ))}
                </div>
                {appliedJobIds.has(job.id) ? (
                  <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Applied</span>
                ) : (
                  <Link href={`/jobs/${job.id}`} className="btn-primary">Apply now</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
