"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, auth } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [job, setJob] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "jobs", id));
      if (!snap.exists()) return setJob(null);
      setJob({ id: snap.id, ...(snap.data() as any) });
    }
    load();

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setHasApplied(false);
        return;
      }

      try {
        const token = await u.getIdToken();
        const response = await fetch("/api/applications/my-applications", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setHasApplied((data.applications || []).some((application: any) => application.jobId === id));
      } catch (error) {
        console.error("Failed to load application state:", error);
      }
    });
    return () => unsub();
  }, [id]);

  async function handleApply() {
    if (!user) return router.push("/auth/signin");
    if (hasApplied) return;
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch("/api/applications/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: user.uid, jobId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to apply");
        return;
      }

      setMessage("Applied successfully.");
      setApplying(false);
      router.push("/applications");
    } catch (err: any) {
      setMessage(err.message || "Failed to apply");
    } finally {
      setApplying(false);
    }
  }

  if (job === null) {
    return (
      <div className="card max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-slate-900">Job not found</h1>
        <p className="mt-2 text-slate-600">This role may have been removed or is no longer accepting applications.</p>
        <Link href="/jobs" className="btn-primary mt-5">
          Back to jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="card max-w-2xl">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-1/3 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-5/6 rounded bg-slate-200" />
          <div className="h-4 w-2/3 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-indigo-600">Open role</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{job.title}</h1>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {job.location} • {job.employmentType}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_0.6fr]">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Role description</h2>
            <p className="mt-3 text-slate-700">{job.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Requirements</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(job.requiredSkills || []).map((skill: string) => (
                <span key={skill} className="rounded-full bg-white px-2.5 py-1 text-sm text-slate-700 ring-1 ring-slate-200">{skill}</span>
              ))}
            </div>
          </div>
        </div>

        {message && <div className={`mt-5 rounded-xl px-3 py-2 text-sm ${message.includes("successfully") ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}

        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={handleApply} disabled={applying || hasApplied} className={hasApplied ? "btn-secondary cursor-not-allowed" : "btn-primary"}>
            {hasApplied ? "Applied" : applying ? "Applying…" : "Apply now"}
          </button>
          <Link href="/jobs" className="btn-secondary">
            Back to jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
