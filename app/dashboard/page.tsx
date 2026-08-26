"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.exists() ? snap.data() : { role: "candidate", name: user.email || "User" };
      setProfile(data);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) {
    return <div className="card max-w-3xl">Loading your dashboard…</div>;
  }

  const isRecruiter = profile?.role === "recruiter";

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">{isRecruiter ? "Recruiter" : "Candidate"}</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Welcome back, {profile?.name || "there"}</h1>
        <p className="mt-2 text-slate-600">{isRecruiter ? "Manage openings and move candidates through the pipeline." : "Keep exploring roles and tracking the status of each application."}</p>
      </div>

      {isRecruiter ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/jobs/new" className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Create</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Post a job</h2>
          </Link>
          <Link href="/my-listings" className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Review</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">My listings</h2>
          </Link>
          <Link href="/applicants" className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Track</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Applicants</h2>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/jobs" className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Explore</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Browse jobs</h2>
          </Link>
          <Link href="/applications" className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Track</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">My applications</h2>
          </Link>
          <Link href="/profile" className="card block transition hover:-translate-y-0.5 hover:shadow-lg">
            <p className="text-sm uppercase tracking-[0.14em] text-slate-500">Complete</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Profile</h2>
          </Link>
        </div>
      )}
    </div>
  );
}
