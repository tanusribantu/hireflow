import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { contact, method } = body as { contact?: string; method?: "email" | "phone" };

  if (!contact || !method) {
    return NextResponse.json({ success: false, error: "Missing contact or method" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
