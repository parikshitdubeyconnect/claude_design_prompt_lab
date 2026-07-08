import { NextRequest, NextResponse } from "next/server";
import {
  getSnapshot,
  heartbeat,
  isValidCode,
  resetScenario,
  resetSession,
  setCore,
  type Phase,
} from "@/lib/session";
import { EX1_SCEN, EX2_SCEN } from "@/lib/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/session/:code/state?pid=xxx
// Returns the live snapshot; registers a heartbeat when a participant id is passed.
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }
  const pid = req.nextUrl.searchParams.get("pid");
  if (pid) await heartbeat(code, pid);
  const snapshot = await getSnapshot(code);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// POST /api/session/:code/state  — facilitator controls
// body: { action: 'goto' | 'reveal' | 'reset', phase?, idx? }
export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
  if (!isValidCode(code)) {
    return NextResponse.json({ error: "Unknown session" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    phase?: Phase;
    idx?: number;
  };

  switch (body.action) {
    case "goto": {
      const phase = body.phase ?? "lobby";
      if (phase === "lobby") {
        await setCore(code, { phase, revealed: false, promptsShown: false });
      } else {
        const list = phase === "ex1" ? EX1_SCEN : EX2_SCEN;
        const idx = Math.max(0, Math.min(list.length - 1, body.idx ?? 0));
        // Switching to a scenario resets that scenario's per-exercise state.
        await resetScenario(code, phase, idx);
        await setCore(code, {
          phase,
          revealed: false,
          promptsShown: false, // rate prompts start hidden until "Show prompts"
          ...(phase === "ex1" ? { ex1Idx: idx } : { ex2Idx: idx }),
        });
      }
      break;
    }
    case "showPrompts":
      await setCore(code, { promptsShown: true });
      break;
    case "reveal":
      await setCore(code, { revealed: true });
      break;
    case "reset":
      await resetSession(code);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const snapshot = await getSnapshot(code);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
