import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { candidateId, jobId } = body as { candidateId?: string; jobId?: string };

  if (!candidateId || !jobId) {
    return NextResponse.json({ error: "Missing candidateId or jobId" }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "Server not configured with Firebase service account" }, { status: 500 });
  }

  try {
    // Check for existing application
    const appsRef = adminDb.collection("applications");
    const q = appsRef.where("candidateId", "==", candidateId).where("jobId", "==", jobId).limit(1);
    const existing = await q.get();
    if (!existing.empty) {
      const doc = existing.docs[0];
      return NextResponse.json({ error: "Application already exists", applicationId: doc.id }, { status: 409 });
    }

    // Create new application
    const now = new Date().toISOString();
    const newApp = {
      candidateId,
      jobId,
      status: "Applied",
      statusHistory: [{ status: "Applied", timestamp: now }],
      matchScore: "Partial",
      appliedAt: now,
    } as any;

    const ref = await appsRef.add(newApp);
    return NextResponse.json({ applicationId: ref.id, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
