"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Suspense, useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { LoadingCardList } from "../components/LoadingSkeleton";

function ApplicantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      try {
        const jobsQuery = query(collection(db, "jobs"), where("recruiterId", "==", user.uid));
        const jobsSnap = await getDocs(jobsQuery);
        const jobDocs = jobsSnap.docs.map((jobDoc) => ({ id: jobDoc.id, ...(jobDoc.data() as any) }));

        const jobIdFilter = searchParams.get("jobId");
        const filteredJobs = jobIdFilter ? jobDocs.filter((job) => job.id === jobIdFilter) : jobDocs;

        const results = await Promise.all(
          filteredJobs.map(async (job) => {
            const token = await user.getIdToken();
            const response = await fetch(`/api/applications/job-applicants?jobId=${encodeURIComponent(job.id)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to load applicants");
            const applications = data.applications || [];

            return { id: job.id, title: job.title, location: job.location, applications };
          })
        );

        const flattened = results.filter((job) => job.applications.length > 0);
        setItems(flattened);
      } catch (loadError: any) {
        console.error("Failed to load recruiter applicants:", loadError);
        setError(loadError.message || "Unable to load applicants");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Recruiter</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Applicants</h1>
        </div>
        <Link href="/jobs/new" className="btn-primary">
          Post a job
        </Link>
      </div>

      {loading ? (
        <LoadingCardList count={3} />
      ) : error ? (
        <div className="card text-center"><p className="text-red-600">{error}</p></div>
      ) : items.length === 0 ? (
        <div className="card text-center">
          <h2 className="text-xl font-semibold text-slate-900">No applicants yet</h2>
          <p className="mt-2 text-slate-600">Candidates will appear here as soon as they apply to your job openings.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/my-listings" className="btn-secondary">
              Review listings
            </Link>
            <Link href="/jobs/new" className="btn-primary">
              Create a role
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((job) => (
            <div key={job.id} className="card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-slate-500">{job.location}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{job.title}</h2>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                  {job.applications.length} candidate{job.applications.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {job.applications.map((application: any) => (
                  <Link key={application.id} href={`/applications/${application.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{application.candidate?.name || "Candidate"}</h3>
                        <p className="text-sm text-slate-600">{application.candidate?.email || "No email on file"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {application.status || "Applied"}
                        </span>
                        <span className="text-sm font-medium text-indigo-600">Review →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense fallback={<LoadingCardList count={3} />}>
      <ApplicantsPageContent />
    </Suspense>
  );
}
