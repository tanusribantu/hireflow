import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

const statuses = new Set([
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Offer",
  "Rejected",
]);

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

function generateSystemRejectionReason(job: any, candidate: any) {
  const evidenceMap = buildCandidateSkillEvidence(candidate);
  const missing = (Array.isArray(job?.requiredSkills) ? job.requiredSkills : [])
    .map((skillEntry: any) => {
      const skillName = typeof skillEntry === "string" ? skillEntry : skillEntry?.skill;
      if (typeof skillName !== "string") return null;
      const normalized = normalizeSkillName(skillName);
      const importance = typeof skillEntry === "string" ? "nice-to-have" : skillEntry?.importance === "must-have" ? "must-have" : "nice-to-have";
      return { skill: skillName.trim(), importance, normalized };
    })
    .filter((skill: { skill: string; importance: string; normalized: string } | null): skill is { skill: string; importance: string; normalized: string } => !!skill)
    .filter((skill: { skill: string; importance: string; normalized: string }) => !evidenceMap[skill.normalized]);

  if (!missing.length) {
    return "Missing required skill: role requirements were not met.";
  }

  const prioritized = [...missing].sort((a, b) => {
    const weight = (value: string) => value === "must-have" ? 1 : 0;
    return weight(b.importance) - weight(a.importance);
  });

  const first = prioritized[0];
  return `Missing required skill: ${first.skill} (${first.importance})`;
}

export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ success: false, error: "Server not configured with Firebase service account" }, { status: 500 });
  }

  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ success: false, error: "Missing Firebase ID token" }, { status: 401 });

    const body = await req.json();
    const { applicationId, newStatus, rejectionReason } = body as {
      applicationId?: string;
      newStatus?: string;
      rejectionReason?: string;
    };

    if (!applicationId || !newStatus) {
      return NextResponse.json({ success: false, error: "Missing applicationId or newStatus" }, { status: 400 });
    }
    if (!statuses.has(newStatus)) {
      return NextResponse.json({ success: false, error: "Invalid application status" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const applicationRef = adminDb.collection("applications").doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const application = applicationSnapshot.data() as any;
    const jobSnapshot = await adminDb.collection("jobs").doc(application.jobId).get();
    if (!jobSnapshot.exists || jobSnapshot.data()?.recruiterId !== decoded.uid) {
      return NextResponse.json({ success: false, error: "Only the owning recruiter can update this application" }, { status: 403 });
    }

    if (newStatus === "Rejected" && application.status === "Interview Completed" && !rejectionReason?.trim()) {
      return NextResponse.json({ success: false, error: "Rejection reason is required after interview completion" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: newStatus,
      statusHistory: [...(application.statusHistory || []), { status: newStatus, timestamp }],
    };

    if (newStatus === "Rejected") {
      if (rejectionReason?.trim()) {
        update.rejectionReason = rejectionReason.trim();
        update.rejectionReasonSource = "recruiter";
      } else if (["Applied", "Under Review", "Shortlisted"].includes(application.status || "")) {
        const candidateSnapshot = await adminDb.collection("users").doc(application.candidateId).get();
        const candidate = candidateSnapshot.exists ? candidateSnapshot.data() as any : {};
        const generatedReason = generateSystemRejectionReason(jobSnapshot.data() as any, candidate);
        update.rejectionReason = generatedReason;
        update.rejectionReasonSource = "system";
      }
    }

    await applicationRef.update(update);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update application status:", error);
    return NextResponse.json({ success: false, error: "Unable to update application status" }, { status: 500 });
  }
}
