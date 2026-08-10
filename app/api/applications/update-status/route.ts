import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { applicationId, newStatus, rejectionReason } = body as {
    applicationId?: string;
    newStatus?: string;
    rejectionReason?: string;
  };

  if (!applicationId || !newStatus) {
    return NextResponse.json({ success: false, error: "Missing applicationId or newStatus" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
