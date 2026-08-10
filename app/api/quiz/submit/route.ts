import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, skill, answers, tabFocusLossCount } = body as {
    userId?: string;
    skill?: string;
    answers?: number[];
    tabFocusLossCount?: number;
  };

  if (!userId || !skill || !answers) {
    return NextResponse.json({ error: "Missing userId, skill, or answers" }, { status: 400 });
  }

  return NextResponse.json({ passed: true, score: 100 });
}
