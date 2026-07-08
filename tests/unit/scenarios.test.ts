import { test } from "node:test";
import assert from "node:assert/strict";
import { EX1_SCEN, EX2_SCEN, LEGEND, RATING_OPTIONS, TIER_FIELD } from "../../lib/scenarios";

const FRAMEWORK = ["role", "context", "task", "format", "constraints", "examples"];

test("write scenarios are Exercise 3 (numbered 3.1–3.3)", () => {
  assert.equal(EX1_SCEN.length, 3);
  assert.deepEqual(EX1_SCEN.map((s) => s.num), ["3.1", "3.2", "3.3"]);
  for (const s of EX1_SCEN) assert.ok(s.ask && s.material, `${s.num} needs ask + material`);
});

test("rate scenarios are Exercise 2 (numbered 2.1–2.3), four prompts each", () => {
  assert.equal(EX2_SCEN.length, 3);
  assert.deepEqual(EX2_SCEN.map((s) => s.num), ["2.1", "2.2", "2.3"]);
  for (const s of EX2_SCEN) assert.equal(s.prompts.length, 4, `${s.num} has four prompts`);
});

test("each rate scenario has exactly one bad / okay / fantastic / overcooked prompt", () => {
  for (const s of EX2_SCEN) {
    const tiers = s.prompts.map((p) => p.tier).sort();
    assert.deepEqual(tiers, ["bad", "fant", "okay", "over"], `${s.num} tier set`);
  }
});

test("four rating options incl. Overcooked, mapped to tally fields", () => {
  assert.deepEqual(RATING_OPTIONS.map((o) => o[0]), ["not", "ok", "fa", "ov"]);
  assert.deepEqual(RATING_OPTIONS.map((o) => o[1]), ["Not so good", "Okay", "Fantastic", "Overcooked"]);
  assert.equal(TIER_FIELD.over, "ov");
  assert.equal(TIER_FIELD.fant, "fa");
});

test("the fantastic prompt sits at a different index across 2.1/2.2/2.3", () => {
  const winnerIdx = EX2_SCEN.map((s) => s.prompts.findIndex((p) => p.tier === "fant"));
  assert.ok(new Set(winnerIdx).size > 1, `winner positions were ${winnerIdx}`);
});

test("ordering rule — the longest prompt is at position A or B in every scenario", () => {
  for (const s of EX2_SCEN) {
    const lengths = s.prompts.map((p) => p.text.length);
    const longestIdx = lengths.indexOf(Math.max(...lengths));
    assert.ok(longestIdx <= 1, `${s.num}: longest prompt is at index ${longestIdx} (must be A=0 or B=1)`);
  }
});

test("anatomy segments cover all six framework components in order", () => {
  for (const s of EX2_SCEN) {
    assert.deepEqual(s.segs.map((g) => g.k), FRAMEWORK, `${s.num} anatomy keys`);
  }
});

test("legend defines all six components with tip + short copy", () => {
  assert.deepEqual(LEGEND.map((l) => l.k), FRAMEWORK);
  for (const l of LEGEND) assert.ok(l.name && l.tip && l.short);
});
