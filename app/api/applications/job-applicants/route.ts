import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server not configured with Firebase service account" }, { status: 500 });
  }
  const db = adminDb;

  const jobId = req.nextUrl.searchParams.get("jobId");
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "Missing Firebase ID token" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const jobSnapshot = await db.collection("jobs").doc(jobId).get();
    if (!jobSnapshot.exists) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (jobSnapshot.data()?.recruiterId !== decoded.uid) {
      return NextResponse.json({ error: "Only the job owner can view applicants" }, { status: 403 });
    }

    const snapshot = await db.collection("applications")
      .where("jobId", "==", jobId)
      .get();
    const applications = await Promise.all(snapshot.docs.map(async (applicationDoc: any) => {
      const application = { id: applicationDoc.id, ...applicationDoc.data() } as any;
      const candidateSnapshot = await db.collection("users").doc(application.candidateId).get();
      return {
        ...application,
        candidate: candidateSnapshot.exists ? candidateSnapshot.data() : { name: "Candidate", email: "" },
      };
    }));

    return NextResponse.json({
      job: { id: jobSnapshot.id, ...jobSnapshot.data() },
      applications,
    });
  } catch (error: any) {
    console.error("Failed to load job applicants:", error);
    return NextResponse.json({ error: "Unable to load applicants" }, { status: 401 });
  }
}