"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../../../lib/firebase";
import { LoadingCardList } from "../../../components/LoadingSkeleton";

export default function ApplicantsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/applications/job-applicants?jobId=${encodeURIComponent(params.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load applicants");
        setJob(data.job);
        setApplications(data.applications || []);
      } catch (loadError: any) {
        console.error("Failed to load applicants:", loadError);
        setError(loadError.message || "Unable to load applicants");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [params.id, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Recruiter</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Applicants</h1>
          <p className="mt-1 text-slate-600">{job?.title || "Job applicants"}</p>
        </div>
        <Link href="/jobs" className="btn-secondary">Back to jobs</Link>
      </div>

      {loading ? <LoadingCardList count={3} /> : error ? (
        <div className="card text-center"><p className="text-red-600">{error}</p></div>
      ) : applications.length === 0 ? (
        <div className="card text-center"><p className="text-slate-600">No applications yet.</p></div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Link key={application.id} href={`/applications/${application.id}`} className="card block hover:shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Candidate</p>
                  <h2 className="mt-1 font-semibold text-slate-900">{application.candidateId}</h2>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">{application.status || "Applied"}</span>
              </div>
              <p className="mt-4 text-sm text-slate-600">Applied {new Date(application.appliedAt || Date.now()).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}