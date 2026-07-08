import { NextRequest, NextResponse } from "next/server";
import { getCore, heartbeat, isValidCode, submitRatings } from "@/lib/session";
import { EX2_SCEN } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TierField = "not" | "ok" | "fa" | "ov";
const VALID: TierField[] = ["not", "ok", "fa", "ov"];

// POST /api/session/:code/rate  — a participant submits their rating set
// body: { pid, picks: ('not'|'ok'|'fa'|null)[] }
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    pid?: string;
    picks?: (string | null)[];
  };
  const pid = (body.pid || "").trim();
  if (!pid) return NextResponse.json({ error: "Missing participant id" }, { status: 400 });

  const core = await getCore(code);
  if (core.phase !== "ex2") {
    return NextResponse.json({ error: "Not rating right now" }, { status: 409 });
  }
  // Gate: participants cannot rate until the facilitator reveals the prompts.
  if (!core.promptsShown) {
    return NextResponse.json({ error: "Prompts not shown yet" }, { status: 409 });
  }
  const promptCount = EX2_SCEN[core.ex2Idx].prompts.length;
  const raw = Array.isArray(body.picks) ? body.picks : [];
  const picks: (TierField | null)[] = Array.from({ length: promptCount }, (_, i) => {
    const p = raw[i];
    return p && VALID.includes(p as TierField) ? (p as TierField) : null;
  });
  if (picks.some((p) => p === null)) {
    return NextResponse.json({ error: "Rate every prompt first" }, { status: 400 });
  }

  await heartbeat(code, pid);
  const accepted = await submitRatings(code, core.ex2Idx, pid, picks);
  return NextResponse.json({ ok: true, counted: accepted });
}
