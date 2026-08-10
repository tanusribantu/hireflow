import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { applicationId, slots, mode } = body as {
    applicationId?: string;
    slots?: string[];
    mode?: "online" | "in-person";
  };

  if (!applicationId || !slots?.length || !mode) {
    return NextResponse.json({ success: false, error: "Missing applicationId, slots, or mode" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
