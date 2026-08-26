"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { LoadingCardList } from "../components/LoadingSkeleton";

export default function MyApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadApplications(user: any) {
    const token = await user.getIdToken();
    const response = await fetch("/api/applications/my-applications", {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load applications");
    setApps(data.applications || []);
  }

  useEffect(() => {
    let refreshTimer: number | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      try {
        await loadApplications(user);
        refreshTimer = window.setInterval(() => {
          loadApplications(user).catch((refreshError) => console.error("Failed to refresh applications:", refreshError));
        }, 10000);
      } catch (loadError: any) {
        console.error("Failed to load my applications:", loadError);
        setError(loadError.message || "Unable to load applications");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Candidate</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">My Applications</h1>
        </div>
        <Link href="/jobs" className="btn-primary">
          Browse jobs
        </Link>
      </div>

      {loading ? (
        <LoadingCardList count={3} />
      ) : error ? (
        <div className="card text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="card text-center">
          <h2 className="text-xl font-semibold text-slate-900">No applications yet</h2>
          <p className="mt-2 text-slate-600">Start by exploring open roles and applying to the jobs that match your skills.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/jobs" className="btn-primary">
              Explore jobs
            </Link>
            <Link href="/profile" className="btn-secondary">
              Update profile
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((application) => (
            <Link key={application.id} href={`/applications/${application.id}`} className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500">{application.job?.location || "Remote"}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{application.job?.title || "Role"}</h2>
                </div>
                <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                  {application.status || "Applied"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>{application.job?.employmentType || "Full-time"}</span>
                <span>•</span>
                <span>{(application.job?.requiredSkills || []).slice(0, 3).join(", ") || "Skills not listed"}</span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm">
                <div>
                  <span>Applied {new Date(application.appliedAt || Date.now()).toLocaleDateString()}</span>
                  {application.status === "Rejected" && application.rejectionReason && (
                    <p className="mt-1 text-red-600">
                      Reason{application.rejectionReasonSource === "system" ? " (system-generated)" : ""}: {application.rejectionReason}
                    </p>
                  )}
                </div>
                <span className="text-indigo-600">View update →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
