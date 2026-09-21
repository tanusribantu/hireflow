"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Suspense, useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { LoadingCardList } from "../components/LoadingSkeleton";

const columns = [
  { label: "New", statuses: ["Applied"] },
  { label: "Screening", statuses: ["Under Review", "Shortlisted"] },
  { label: "Interview Scheduled", statuses: ["Interview Scheduled"] },
  { label: "Interview Completed", statuses: ["Interview Completed"] },
  { label: "Offer", statuses: ["Offer"] },
  { label: "Rejected", statuses: ["Rejected"] },
];

const matchFilterOptions = ["All", "Low", "Partial", "Strong"] as const;
type MatchFilter = (typeof matchFilterOptions)[number];

function normalizeSkillName(skill: string) {
  return skill.trim().toLowerCase();
}

function chooseHigherEvidenceTier(current: string | undefined, incoming: string) {
  const weights: Record<string, number> = {
    "self-reported": 1,
    "project-backed": 2,
    "quiz-verified": 3,
  };
  const currentWeight = current ? weights[current] ?? 0 : 0;
  const incomingWeight = weights[incoming] ?? 0;
  return incomingWeight > currentWeight ? incoming : current ?? incoming;
}

function buildCandidateSkillEvidence(candidate: any) {
  const evidenceMap: Record<string, string> = {};
  for (const skill of Array.isArray(candidate?.skills) ? candidate.skills : []) {
    if (typeof skill !== "string") continue;
    const normalized = normalizeSkillName(skill);
    evidenceMap[normalized] = chooseHigherEvidenceTier(evidenceMap[normalized], "self-reported");
  }
  for (const project of Array.isArray(candidate?.projects) ? candidate.projects : []) {
    if (!project || !Array.isArray(project.demonstratesSkills)) continue;
    for (const skill of project.demonstratesSkills) {
      if (typeof skill !== "string") continue;
      const normalized = normalizeSkillName(skill);
      evidenceMap[normalized] = chooseHigherEvidenceTier(evidenceMap[normalized], "project-backed");
    }
  }
  for (const entry of Array.isArray(candidate?.verifiedSkills) ? candidate.verifiedSkills : []) {
    const skillName = typeof entry === "string" ? entry : entry?.skill;
    if (typeof skillName !== "string") continue;
    const normalized = normalizeSkillName(skillName);
    evidenceMap[normalized] = chooseHigherEvidenceTier(evidenceMap[normalized], "quiz-verified");
  }
  return evidenceMap;
}

function calculateWeightedMatch(candidate: any, job: any) {
  const evidenceMap = buildCandidateSkillEvidence(candidate);
  const requiredSkills = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];

  if (!requiredSkills.length) {
    return { matchScore: null, matchedSkills: [], missingSkills: [] };
  }

  let weightedTotal = 0;
  let maxPossible = 0;
  const matchedSkills: Array<{ skill: string; evidenceTier: string }> = [];
  const missingSkills: Array<{ skill: string; importance: string }> = [];

  for (const requiredSkill of requiredSkills) {
    const skillName = typeof requiredSkill === "string" ? requiredSkill : requiredSkill?.skill;
    if (typeof skillName !== "string") continue;
    const normalized = normalizeSkillName(skillName);
    const importance = typeof requiredSkill === "string" ? "nice-to-have" : requiredSkill?.importance === "must-have" ? "must-have" : "nice-to-have";
    const importanceWeight = importance === "must-have" ? 3 : 1;
    maxPossible += 3 * importanceWeight;

    const evidenceTier = evidenceMap[normalized];
    if (!evidenceTier) {
      missingSkills.push({ skill: skillName.trim(), importance });
      continue;
    }

    const evidenceWeight = evidenceTier === "quiz-verified" ? 3 : evidenceTier === "project-backed" ? 2 : 1;
    weightedTotal += evidenceWeight * importanceWeight;
    matchedSkills.push({ skill: skillName.trim(), evidenceTier });
  }

  if (maxPossible === 0) {
    return { matchScore: null, matchedSkills: [], missingSkills: [] };
  }

  const percentage = (weightedTotal / maxPossible) * 100;
  const matchScore = percentage > 70 ? "Strong" : percentage >= 40 ? "Partial" : "Low";

  return { matchScore, matchedSkills, missingSkills };
}

function ApplicantsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [pendingStatusById, setPendingStatusById] = useState<Record<string, string>>({});
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("All");

  async function loadApplicants(user: any) {
    const jobsSnap = await getDocs(query(collection(db, "jobs"), where("recruiterId", "==", user.uid)));
    const jobDocs = jobsSnap.docs.map((jobDoc) => ({ id: jobDoc.id, ...(jobDoc.data() as any) }));
    const jobIdFilter = searchParams.get("jobId");
    const filteredJobs = jobIdFilter ? jobDocs.filter((job) => job.id === jobIdFilter) : jobDocs;
    const token = await user.getIdToken();
    const results = await Promise.all(filteredJobs.map(async (job) => {
      const response = await fetch(`/api/applications/job-applicants?jobId=${encodeURIComponent(job.id)}`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load applicants");
      const applications = (data.applications || []).map((application: any) => ({
        ...application,
        ...(application.candidate ? calculateWeightedMatch(application.candidate, job) : { matchScore: null, matchedSkills: [], missingSkills: [] }),
      }));
      return { ...job, applications };
    }));
    setItems(results);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        await loadApplicants(user);
      } catch (loadError: any) {
        console.error("Failed to load recruiter applicants:", loadError);
        setError(loadError.message || "Unable to load applicants");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, searchParams]);

  async function updateStatus(application: any, newStatus: string, rejectionReason?: string) {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/signin");
      return;
    }
    setUpdatingId(application.id);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/applications/update-status", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ applicationId: application.id, newStatus, rejectionReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update status");
      await loadApplicants(user);
      setPendingStatusById((pending) => {
        const next = { ...pending };
        delete next[application.id];
        return next;
      });
    } catch (updateError: any) {
      console.error("Failed to update application status:", updateError);
      setError(updateError.message || "Unable to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleStatusSelection(application: any, newStatus: string) {
    const isEarlyRejection = newStatus === "Rejected" && ["Applied", "Under Review", "Shortlisted"].includes(application.status || "Applied");
    if (isEarlyRejection) {
      setPendingStatusById({ ...pendingStatusById, [application.id]: newStatus });
      return;
    }
    updateStatus(application, newStatus);
  }

  const filteredJobs = items.map((job) => ({
    ...job,
    applications: (job.applications || []).filter((application: any) => matchFilter === "All" || application.matchScore === matchFilter),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-indigo-600">Recruiter</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Applicant pipeline</h1>
          <p className="mt-1 text-slate-600">Move candidates through each hiring stage.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">Post a job</Link>
      </div>

      <div className="card flex items-center justify-end gap-3">
        <label className="text-sm font-medium text-slate-700">Filter by match score</label>
        <select
          value={matchFilter}
          onChange={(event) => setMatchFilter(event.target.value as MatchFilter)}
          className="input-field w-auto min-w-[140px]"
        >
          {matchFilterOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      {loading ? <LoadingCardList count={3} /> : error ? (
        <div className="card text-center"><p className="text-red-600">{error}</p></div>
      ) : filteredJobs.length === 0 ? (
        <div className="card text-center"><h2 className="text-xl font-semibold">No applicants yet</h2><p className="mt-2 text-slate-600">Applicants will appear here as candidates apply.</p></div>
      ) : (
        <div className="space-y-8">
          {filteredJobs.map((job) => (
            <section key={job.id} className="space-y-4">
              <div className="flex items-center justify-between"><div><h2 className="text-xl font-semibold text-slate-900">{job.title}</h2><p className="text-sm text-slate-600">{job.location}</p></div><Link href={`/jobs/${job.id}/applicants`} className="btn-secondary">Open job view</Link></div>
              <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-6">
                {columns.map((column) => {
                  const applications = (job.applications || []).filter((application: any) => column.statuses.includes(application.status || "Applied"));
                  return <div key={column.label} className="min-w-[260px] rounded-2xl bg-slate-100 p-3">
                    <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800">{column.label}</h3><span className="text-sm text-slate-500">{applications.length}</span></div>
                    <div className="mt-3 space-y-3">
                      {applications.map((application: any) => <article key={application.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{application.candidate?.name || "Candidate"}</h4>
                            <p className="mt-1 text-xs text-slate-500">{application.status || "Applied"}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            application.matchScore === "Strong"
                              ? "bg-emerald-100 text-emerald-800"
                              : application.matchScore === "Partial"
                                ? "bg-amber-100 text-amber-800"
                                : application.matchScore === "Low"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-slate-100 text-slate-500"
                          }`}>{application.matchScore || "N/A"}</span>
                        </div>
                        <p className="mt-3 text-xs text-slate-600">{(application.candidate?.skills || []).slice(0, 4).join(", ") || "Skills not listed"}</p>
                        <select value={pendingStatusById[application.id] || application.status || "Applied"} disabled={updatingId === application.id} onChange={(event) => handleStatusSelection(application, event.target.value)} className="input-field mt-3 text-sm">
                          {columns.flatMap((stage) => stage.statuses).map((status) => <option key={status}>{status}</option>)}
                        </select>
                        {pendingStatusById[application.id] === "Rejected" && <div className="mt-2 space-y-2"><select value={reasonById[application.id] || ""} onChange={(event) => setReasonById({ ...reasonById, [application.id]: event.target.value })} className="input-field text-sm"><option value="">Optional rejection reason</option><option>Skills mismatch</option><option>Experience level</option><option>Location</option><option>Position filled</option></select><button type="button" disabled={updatingId === application.id} onClick={() => updateStatus(application, "Rejected", reasonById[application.id])} className="btn-secondary w-full text-sm">Confirm rejection</button></div>}
                      </article>)}
                      {applications.length === 0 && <p className="py-6 text-center text-xs text-slate-500">No candidates</p>}
                    </div>
                  </div>;
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return <Suspense fallback={<LoadingCardList count={3} />}><ApplicantsPageContent /></Suspense>;
}
