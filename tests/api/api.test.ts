import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// API-level integration tests. Requires the app running (default :3100).
//   PL_PORT=3100 node --import tsx --test tests/api/api.test.ts
const BASE = `http://localhost:${process.env.PL_PORT || "3100"}`;
const CODE = "4271";

async function post(path: string, body: unknown) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const state = () => fetch(`${BASE}/api/session/${CODE}/state`, { cache: "no-store" }).then((r) => r.json());
const goto = (phase: string, idx = 0) => post(`/api/session/${CODE}/state`, { action: "goto", phase, idx });
const totalRatings = (r: { not: number; ok: number; fa: number; ov: number }[]) =>
  r.reduce((a, t) => a + t.not + t.ok + t.fa + t.ov, 0);

before(async () => {
  await post(`/api/session/${CODE}/state`, { action: "reset" });
});

test("T1.3 — invalid session code → 404, no crash", async () => {
  assert.equal((await fetch(`${BASE}/api/session/9999/state`)).status, 404);
  const r2 = await post(`/api/session/9999/submit`, { pid: "x", text: "hello world here" });
  assert.equal(r2.status, 404);
});

test("T2.5 — reset clears submissions, ratings and returns to lobby", async () => {
  await goto("ex1", 0);
  await post(`/api/session/${CODE}/submit`, { pid: "p1", text: "You are an RM, draft a reply under 200 words." });
  await post(`/api/session/${CODE}/state`, { action: "reset" });
  const s = await state();
  assert.equal(s.phase, "lobby");
  assert.equal(s.promptsShown, false);
  assert.equal(s.submissions.length, 0);
  assert.equal(s.ratings.length, 4);
  assert.equal(totalRatings(s.ratings), 0);
});

test("T3.1 (server) — submission under 10 chars rejected", async () => {
  await goto("ex1", 0);
  const r = await post(`/api/session/${CODE}/submit`, { pid: "p_short", text: "hi" });
  assert.equal(r.status, 400);
});

test("T3.2 — submission appears with anonymous participant label", async () => {
  await goto("ex1", 0);
  await post(`/api/session/${CODE}/submit`, { pid: "p_named", text: "You are an RM, acknowledge both failures and list fixes." });
  const s = await state();
  const mine = s.submissions.find((x: { id: string }) => x.id === "p_named");
  assert.ok(mine);
  assert.match(mine.name, /^Participant \d+$/);
});

test("T3.7 — edit-and-resubmit replaces, does not duplicate", async () => {
  await goto("ex1", 0);
  await post(`/api/session/${CODE}/submit`, { pid: "p_edit", text: "first version of my prompt here" });
  await post(`/api/session/${CODE}/submit`, { pid: "p_edit", text: "second edited version of my prompt" });
  const s = await state();
  const mine = s.submissions.filter((x: { id: string }) => x.id === "p_edit");
  assert.equal(mine.length, 1);
  assert.match(mine[0].text, /second edited/);
});

test("T3.6 / T5.4 — participant capped at 3 Claude runs per scenario", async () => {
  await post(`/api/session/${CODE}/state`, { action: "reset" });
  await goto("ex1", 0);
  const call = () =>
    post(`/api/claude`, { prompt: "Summarise this", artifact: "MEMO", role: "participant", code: CODE, pid: "p_limit", ex1Idx: 0 });
  for (let i = 0; i < 3; i++) assert.equal((await call()).status, 200, `run ${i + 1} ok`);
  assert.equal((await call()).status, 429);
});

test("T5.6 — oversized prompt rejected server-side (413)", async () => {
  const r = await post(`/api/claude`, { prompt: "x".repeat(5000), artifact: "M", role: "facilitator", code: CODE });
  assert.equal(r.status, 413);
});

test("T5.3 — system prompt is server-owned; client cannot override or strip it", () => {
  const src = readFileSync(join(process.cwd(), "app/api/claude/route.ts"), "utf8");
  assert.match(src, /system:\s*SYS/);
  assert.doesNotMatch(src, /body\.system/);
});

test("T3.x gate — rating is rejected before the facilitator shows the prompts", async () => {
  await post(`/api/session/${CODE}/state`, { action: "reset" });
  await goto("ex2", 0); // prompts start hidden
  const r = await post(`/api/session/${CODE}/rate`, { pid: "p_early", picks: ["ok", "not", "fa", "ov"] });
  assert.equal(r.status, 409, "rating blocked while prompts hidden");
  const s = await state();
  assert.equal(totalRatings(s.ratings), 0);
});

test("T4.1 — rating rejected unless all four prompts rated (after Show prompts)", async () => {
  await goto("ex2", 0);
  await post(`/api/session/${CODE}/state`, { action: "showPrompts" });
  const r = await post(`/api/session/${CODE}/rate`, { pid: "p_partial", picks: ["ok", null, "fa", "ov"] });
  assert.equal(r.status, 400);
});

test("T4.2 / T4.3 — ratings aggregate (four picks); one set per participant", async () => {
  await post(`/api/session/${CODE}/state`, { action: "reset" });
  await goto("ex2", 0);
  await post(`/api/session/${CODE}/state`, { action: "showPrompts" });
  const first = await (await post(`/api/session/${CODE}/rate`, { pid: "p_r1", picks: ["ok", "not", "fa", "ov"] })).json();
  assert.equal(first.counted, true);
  const dup = await (await post(`/api/session/${CODE}/rate`, { pid: "p_r1", picks: ["fa", "fa", "fa", "fa"] })).json();
  assert.equal(dup.counted, false);
  await post(`/api/session/${CODE}/rate`, { pid: "p_r2", picks: ["fa", "not", "fa", "ov"] });
  const s = await state();
  assert.equal(totalRatings(s.ratings), 8, "two participants × four picks, no double count");
});

test("T4.6 — switching rate scenario resets aggregates and re-hides prompts", async () => {
  await goto("ex2", 0);
  await post(`/api/session/${CODE}/state`, { action: "showPrompts" });
  await post(`/api/session/${CODE}/rate`, { pid: "p_sw", picks: ["ok", "ok", "ok", "ok"] });
  await goto("ex2", 1);
  const s = await state();
  assert.equal(totalRatings(s.ratings), 0);
  assert.equal(s.promptsShown, false);
});

test("Document flash — toggleDoc broadcasts docShown; scenario switch hides it", async () => {
  await post(`/api/session/${CODE}/state`, { action: "reset" });
  await goto("ex1", 0);
  assert.equal((await state()).docShown, false);
  await post(`/api/session/${CODE}/state`, { action: "toggleDoc" });
  assert.equal((await state()).docShown, true, "toggleDoc turns the document on");
  await post(`/api/session/${CODE}/state`, { action: "toggleDoc" });
  assert.equal((await state()).docShown, false, "toggleDoc turns it back off");
  await post(`/api/session/${CODE}/state`, { action: "toggleDoc" }); // on again
  await goto("ex1", 1); // switching scenario
  assert.equal((await state()).docShown, false, "switching scenarios takes the document down");
});

test("T5.1 / T5.2 — no Anthropic endpoint or key header in the client bundle", () => {
  const dir = join(process.cwd(), ".next/static");
  assert.ok(existsSync(dir), "run `npm run build` before this test");
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".js")) files.push(p);
    }
  };
  walk(dir);
  for (const f of files) {
    const txt = readFileSync(f, "utf8");
    assert.ok(!txt.includes("api.anthropic.com"), `${f} must not call Anthropic directly`);
    assert.ok(!txt.includes("x-api-key"), `${f} must not carry an api key header`);
    assert.ok(!txt.includes("ANTHROPIC_API_KEY"), `${f} must not embed the key name`);
  }
});
