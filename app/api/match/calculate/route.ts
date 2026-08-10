import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { candidateId, jobId } = body as { candidateId?: string; jobId?: string };

  if (!candidateId || !jobId) {
    return NextResponse.json({ error: "Missing candidateId or jobId" }, { status: 400 });
  }

  return NextResponse.json({
    matchScore: "Partial",
    matchedSkills: [],
    missingSkills: [],
  });
}
