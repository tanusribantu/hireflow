import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { applicationId, chosenSlot } = body as { applicationId?: string; chosenSlot?: string };

  if (!applicationId || !chosenSlot) {
    return NextResponse.json({ success: false, error: "Missing applicationId or chosenSlot" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
