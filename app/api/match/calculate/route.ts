import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";

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

  return Object.entries(evidenceMap).map(([skill, evidenceTier]) => ({ skill, evidenceTier }));
}

function normalizeRequiredSkills(requiredSkills: unknown) {
  if (!Array.isArray(requiredSkills)) return [] as Array<{ skill: string; importance: "must-have" | "nice-to-have" }>;

  return requiredSkills.map((entry) => {
    if (typeof entry === "string") {
      return { skill: normalizeSkillName(entry), importance: "nice-to-have" as const };
    }
    if (entry && typeof entry === "object" && "skill" in entry && typeof (entry as any).skill === "string") {
      return {
        skill: normalizeSkillName((entry as any).skill),
        importance: (entry as any).importance === "must-have" ? "must-have" : "nice-to-have",
      };
    }
    return null;
  }).filter((entry): entry is { skill: string; importance: "must-have" | "nice-to-have" } => !!entry);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, jobId } = body as { candidateId?: string; jobId?: string };

    if (!candidateId || !jobId) {
      return NextResponse.json({ error: "Missing candidateId or jobId" }, { status: 400 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 500 });
    }

    const [candidateSnapshot, jobSnapshot] = await Promise.all([
      adminDb.collection("users").doc(candidateId).get(),
      adminDb.collection("jobs").doc(jobId).get(),
    ]);

    if (!candidateSnapshot.exists || !jobSnapshot.exists) {
      return NextResponse.json({ error: "Candidate or job not found" }, { status: 404 });
    }

    const candidate = candidateSnapshot.data() as any;
    const job = jobSnapshot.data() as any;

    if (job?.atsEnabled === false) {
      return NextResponse.json({
        matchScore: null,
        matchedSkills: [],
        missingSkills: [],
      });
    }

    const candidateSkills = buildCandidateSkillEvidence(candidate);
    const jobRequiredSkills = normalizeRequiredSkills(job?.requiredSkills ?? []);

    const matchResponse = await fetch("http://localhost:8080/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateSkills, jobRequiredSkills }),
    });

    const result = await matchResponse.json();
    if (!matchResponse.ok) {
      return NextResponse.json(result, { status: matchResponse.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Match calculation failed:", error);
    return NextResponse.json({ error: "Match service unavailable" }, { status: 502 });
  }
}
