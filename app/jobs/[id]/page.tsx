"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [job, setJob] = useState<any | null>(null);
  const [user, setUser] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "jobs", id));
      if (!snap.exists()) return setJob(null);
      setJob({ id: snap.id, ...(snap.data() as any) });
    }
    load();

    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [id]);

  async function handleApply() {
    if (!user) return router.push("/auth/signin");
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
        } else {
        setMessage("Applied successfully.");
        // clear applying before navigation
        setApplying(false);
        router.push(`/applications`);
      }
    } catch (err: any) {
      setMessage(err.message || "Failed to apply");
    } finally {
      // ensure applying cleared in case of errors
      setApplying(false);
    }
  }

  if (job === null) return <div className="p-8">Job not found</div>;
  if (!job) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{job.title}</h2>
          <div className="text-sm text-gray-500">{job.location} • {job.employmentType}</div>
        </div>
        <p className="mt-4 text-gray-700">{job.description}</p>
        <div className="mt-4">
          <div className="text-sm text-gray-500">Skills: {(job.requiredSkills || []).join(", ")}</div>
        </div>

        {message && <div className="mt-4 text-sm text-red-600">{message}</div>}

        <div className="mt-6">
          <button onClick={handleApply} disabled={applying} className="px-4 py-2 bg-indigo-600 text-white rounded">
            {applying ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
