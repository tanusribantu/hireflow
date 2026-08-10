import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { contact, code } = body as { contact?: string; code?: string };

  if (!contact || !code) {
    return NextResponse.json({ verified: false, error: "Missing contact or code" }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
