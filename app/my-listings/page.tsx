"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { LoadingCardList } from "../components/LoadingSkeleton";

export default function MyListingsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      try {
        const q = query(collection(db, "jobs"), where("recruiterId", "==", user.uid));
        const snap = await getDocs(q);
        const results = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        setJobs(results.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Recruiter</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">My Listings</h1>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          Post a job
        </Link>
      </div>

      {loading ? (
        <LoadingCardList count={3} />
      ) : jobs.length === 0 ? (
        <div className="card text-center">
          <h2 className="text-xl font-semibold text-slate-900">No jobs posted yet</h2>
          <p className="mt-2 text-slate-600">Create your first opening to start collecting candidates in one place.</p>
          <div className="mt-6 flex justify-center">
            <Link href="/jobs/new" className="btn-primary">
              Create listing
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="card">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">{job.title}</h2>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      {job.status || "open"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{job.location} • {job.employmentType}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/applicants?jobId=${job.id}`} className="btn-secondary">
                    View applicants
                  </Link>
                  <Link href={`/jobs/${job.id}`} className="btn-primary">
                    Open listing
                  </Link>
                </div>
              </div>

              <p className="mt-4 text-slate-600">{job.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {(job.requiredSkills || []).map((skill: string) => (
                  <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
