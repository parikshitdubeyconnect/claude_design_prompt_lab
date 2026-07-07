// Shared session state — the realtime source of truth every device polls.
// Facilitator writes phase/scenario/reveal; participants write joins,
// submissions and ratings; everyone reads a derived snapshot.

import { getKV } from "./kv";
import {
  EX1_SCEN,
  EX2_SCEN,
  MAX_RUNS_PER_SCENARIO,
  SESSION_CODE,
  type Tier,
} from "./scenarios";

export type Phase = "lobby" | "ex1" | "ex2";

export interface SessionCore {
  phase: Phase;
  ex1Idx: number;
  ex2Idx: number;
  revealed: boolean;
  updatedAt: number;
}

export interface Submission {
  id: string; // participant id — one submission per participant per scenario
  name: string;
  text: string;
  ts: number;
}

export interface RatingTally {
  not: number;
  ok: number;
  fa: number;
}

export interface SessionSnapshot extends SessionCore {
  participants: number;
  submissions: Submission[]; // for the current ex1 scenario
  ratings: RatingTally[]; // three tallies for the current ex2 scenario
}

const PARTICIPANT_STALE_MS = 30_000;
const DEFAULT_CORE: SessionCore = {
  phase: "lobby",
  ex1Idx: 0,
  ex2Idx: 0,
  revealed: false,
  updatedAt: 0,
};

// ── Key helpers ──
const kCore = (code: string) => `pl:${code}:core`;
const kParticipants = (code: string) => `pl:${code}:participants`;
const kSubs = (code: string, ex1Idx: number) => `pl:${code}:subs:${ex1Idx}`;
const kRatings = (code: string, ex2Idx: number) => `pl:${code}:ratings:${ex2Idx}`;
const kRated = (code: string, ex2Idx: number) => `pl:${code}:rated:${ex2Idx}`;
const kRuns = (code: string, ex1Idx: number) => `pl:${code}:runs:${ex1Idx}`;

export function isValidCode(code: string): boolean {
  return code === SESSION_CODE;
}

// ── Core state ──
export async function getCore(code: string): Promise<SessionCore> {
  const kv = getKV();
  return (await kv.getJSON<SessionCore>(kCore(code))) ?? { ...DEFAULT_CORE };
}

export async function setCore(code: string, patch: Partial<SessionCore>): Promise<SessionCore> {
  const kv = getKV();
  const cur = await getCore(code);
  const next: SessionCore = { ...cur, ...patch, updatedAt: Date.now() };
  await kv.setJSON(kCore(code), next);
  return next;
}

// ── Participants (live count via last-seen heartbeats) ──
export async function heartbeat(code: string, pid: string): Promise<void> {
  await getKV().hset(kParticipants(code), pid, Date.now());
}

export async function participantCount(code: string): Promise<number> {
  const all = await getKV().hgetall(kParticipants(code));
  if (!all) return 0;
  const now = Date.now();
  let n = 0;
  for (const ts of Object.values(all)) {
    if (now - Number(ts) < PARTICIPANT_STALE_MS) n++;
  }
  return n;
}

// ── Submissions (Exercise 2.x) ──
export async function upsertSubmission(
  code: string,
  ex1Idx: number,
  sub: Submission,
): Promise<void> {
  await getKV().hset(kSubs(code, ex1Idx), sub.id, JSON.stringify(sub));
}

export async function getSubmissions(code: string, ex1Idx: number): Promise<Submission[]> {
  const all = await getKV().hgetall(kSubs(code, ex1Idx));
  if (!all) return [];
  const subs: Submission[] = [];
  for (const raw of Object.values(all)) {
    try {
      subs.push(typeof raw === "string" ? JSON.parse(raw) : (raw as Submission));
    } catch {
      /* skip corrupt entry */
    }
  }
  return subs.sort((a, b) => a.ts - b.ts);
}

// ── Ratings (Exercise 3.x) ──
const TIER_FIELDS = ["not", "ok", "fa"] as const;
type TierField = (typeof TIER_FIELDS)[number];

export async function submitRatings(
  code: string,
  ex2Idx: number,
  pid: string,
  picks: (TierField | null)[],
): Promise<boolean> {
  const kv = getKV();
  // one rating set per participant per scenario
  const rated = await kv.hgetall(kRated(code, ex2Idx));
  if (rated && rated[pid]) return false;
  await kv.hset(kRated(code, ex2Idx), pid, 1);
  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i];
    if (pick) await kv.hincrby(kRatings(code, ex2Idx), `${i}:${pick}`, 1);
  }
  return true;
}

export async function getRatings(code: string, ex2Idx: number): Promise<RatingTally[]> {
  const all = await getKV().hgetall(kRatings(code, ex2Idx));
  const promptCount = EX2_SCEN[ex2Idx]?.prompts.length ?? 3;
  const out: RatingTally[] = Array.from({ length: promptCount }, () => ({ not: 0, ok: 0, fa: 0 }));
  if (!all) return out;
  for (const [field, val] of Object.entries(all)) {
    const [idxStr, tier] = field.split(":");
    const idx = Number(idxStr);
    if (out[idx] && (TIER_FIELDS as readonly string[]).includes(tier)) {
      out[idx][tier as TierField] = Number(val) || 0;
    }
  }
  return out;
}

// ── Per-participant run limits (Try it yourself) ──
export async function runsUsed(code: string, ex1Idx: number, pid: string): Promise<number> {
  const all = await getKV().hgetall(kRuns(code, ex1Idx));
  return all && all[pid] ? Number(all[pid]) : 0;
}

export async function incRun(code: string, ex1Idx: number, pid: string): Promise<number> {
  return getKV().hincrby(kRuns(code, ex1Idx), pid, 1);
}

export function runsLeft(used: number): number {
  return Math.max(0, MAX_RUNS_PER_SCENARIO - used);
}

// ── Composed snapshot for polling clients ──
export async function getSnapshot(code: string): Promise<SessionSnapshot> {
  const core = await getCore(code);
  const [participants, submissions, ratings] = await Promise.all([
    participantCount(code),
    getSubmissions(code, core.ex1Idx),
    getRatings(code, core.ex2Idx),
  ]);
  return { ...core, participants, submissions, ratings };
}

// ── Reset the whole session (fresh room) ──
export async function resetSession(code: string): Promise<void> {
  const kv = getKV();
  await kv.setJSON(kCore(code), { ...DEFAULT_CORE, updatedAt: Date.now() });
  await kv.del(kParticipants(code));
  for (let i = 0; i < EX1_SCEN.length; i++) {
    await kv.del(kSubs(code, i));
    await kv.del(kRuns(code, i));
  }
  for (let i = 0; i < EX2_SCEN.length; i++) {
    await kv.del(kRatings(code, i));
    await kv.del(kRated(code, i));
  }
}

// Clear per-scenario state when the facilitator switches scenarios.
export async function resetScenario(code: string, phase: Phase, idx: number): Promise<void> {
  const kv = getKV();
  if (phase === "ex1") {
    await kv.del(kSubs(code, idx));
    await kv.del(kRuns(code, idx));
  } else if (phase === "ex2") {
    await kv.del(kRatings(code, idx));
    await kv.del(kRated(code, idx));
  }
}

export type { Tier };
