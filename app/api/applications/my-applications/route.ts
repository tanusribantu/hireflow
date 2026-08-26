import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server not configured with Firebase service account" }, { status: 500 });
  }
  const db = adminDb;

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Missing Firebase ID token" }, { status: 401 });

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const snapshot = await db.collection("applications")
      .where("candidateId", "==", decoded.uid)
      .get();

    const applications = await Promise.all(snapshot.docs.map(async (applicationDoc: any) => {
      const application = { id: applicationDoc.id, ...applicationDoc.data() } as any;
      const jobSnapshot = await db.collection("jobs").doc(application.jobId).get();
      return {
        ...application,
        job: jobSnapshot.exists ? { id: jobSnapshot.id, ...jobSnapshot.data() } : null,
      };
    }));

    applications.sort((a: any, b: any) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime());
    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error("Failed to load candidate applications:", error);
    return NextResponse.json({ error: "Unable to load applications" }, { status: 401 });
  }
}