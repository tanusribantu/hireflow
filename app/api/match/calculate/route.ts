import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";

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

    const candidate = candidateSnapshot.data() as {
      skills?: unknown;
      verifiedSkills?: Array<{ skill?: unknown }>;
    };
    const job = jobSnapshot.data() as { requiredSkills?: unknown };
    const candidateSkills = [
      ...(Array.isArray(candidate.skills) ? candidate.skills : []),
      ...(Array.isArray(candidate.verifiedSkills)
        ? candidate.verifiedSkills.map((item) => item.skill)
        : []),
    ].filter((skill): skill is string => typeof skill === "string");
    const jobRequiredSkills = Array.isArray(job.requiredSkills)
      ? job.requiredSkills.filter((skill): skill is string => typeof skill === "string")
      : [];

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
