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
    if (newStatus === "Rejected" && rejectionReason?.trim()) {
      update.rejectionReason = rejectionReason.trim();
      update.rejectionReasonSource = "recruiter";
    }

    await applicationRef.update(update);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update application status:", error);
    return NextResponse.json({ success: false, error: "Unable to update application status" }, { status: 500 });
  }
}
