import { NextRequest, NextResponse } from "next/server";
import { getCore, heartbeat, isValidCode, upsertSubmission } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PROMPT_LEN = 4000;

// Stable two-digit label from a participant id (deterministic, non-reversible).
function pidNumber(pid: string): string {
  let h = 0;
  for (let i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) & 0xffff;
  return String((h % 90) + 10);
}

// POST /api/session/:code/submit  — a participant submits (or edits) their prompt
// body: { pid, name, text }
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    pid?: string;
    text?: string;
  };
  const pid = (body.pid || "").trim();
  const text = (body.text || "").trim();
  if (!pid) return NextResponse.json({ error: "Missing participant id" }, { status: 400 });
  if (text.length < 10) {
    return NextResponse.json({ error: "Prompt too short" }, { status: 400 });
  }
  if (text.length > MAX_PROMPT_LEN) {
    return NextResponse.json({ error: "Prompt too long" }, { status: 413 });
  }

  const core = await getCore(code);
  if (core.phase !== "ex1") {
    return NextResponse.json({ error: "Not accepting submissions right now" }, { status: 409 });
  }
  const idx = core.ex1Idx;
  // Anonymous, stable per-device label ("Participant 07") derived from the pid —
  // distinct between phones, and never personal data.
  const name = `Participant ${pidNumber(pid)}`;

  await heartbeat(code, pid);
  await upsertSubmission(code, idx, { id: pid, name, text, ts: Date.now() });

  return NextResponse.json({ ok: true });
}
