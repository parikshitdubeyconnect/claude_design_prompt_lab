import { test } from "node:test";
import assert from "node:assert/strict";
import { EX1_SCEN, EX2_SCEN, LEGEND } from "../../lib/scenarios";

const FRAMEWORK = ["role", "context", "task", "format", "constraints", "examples"];

test("three write scenarios numbered 2.1–2.3", () => {
  assert.equal(EX1_SCEN.length, 3);
  assert.deepEqual(EX1_SCEN.map((s) => s.num), ["2.1", "2.2", "2.3"]);
  for (const s of EX1_SCEN) assert.ok(s.ask && s.material, `${s.num} needs ask + material`);
});

test("three rate scenarios numbered 3.1–3.3", () => {
  assert.equal(EX2_SCEN.length, 3);
  assert.deepEqual(EX2_SCEN.map((s) => s.num), ["3.1", "3.2", "3.3"]);
});

test("each rate scenario has exactly one bad / okay / fantastic prompt", () => {
  for (const s of EX2_SCEN) {
    const tiers = s.prompts.map((p) => p.tier).sort();
    assert.deepEqual(tiers, ["bad", "fant", "okay"], `${s.num} tier set`);
  }
});

test("T4.4 — the fantastic prompt sits at a different index across 3.1/3.2/3.3", () => {
  const winnerIdx = EX2_SCEN.map((s) => s.prompts.findIndex((p) => p.tier === "fant"));
  // Not all identical → not guessable by position.
  assert.ok(new Set(winnerIdx).size > 1, `winner positions were ${winnerIdx}`);
});

test("T4.5 — anatomy segments cover all six framework components in order", () => {
  for (const s of EX2_SCEN) {
    assert.deepEqual(s.segs.map((g) => g.k), FRAMEWORK, `${s.num} anatomy keys`);
  }
});

test("legend defines all six components with tip + short copy", () => {
  assert.deepEqual(LEGEND.map((l) => l.k), FRAMEWORK);
  for (const l of LEGEND) assert.ok(l.name && l.tip && l.short);
});
