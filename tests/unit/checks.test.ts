import { test } from "node:test";
import assert from "node:assert/strict";
import { checksFor } from "../../lib/checks";

// T3.3 — heuristic chips (Role / Context / Format / Constraints) must match the
// detection rules. Positive + negative fixtures per class.

function map(text: string): Record<string, boolean> {
  return Object.fromEntries(checksFor(text).map((c) => [c.name, c.ok]));
}

test("returns exactly the four framework checks", () => {
  const names = checksFor("anything").map((c) => c.name);
  assert.deepEqual(names, ["Role", "Context", "Format", "Constraints"]);
});

test("Role — positive triggers", () => {
  for (const t of [
    "You are a senior analyst",
    "Act as an RM",
    "as a modernisation architect who has done this",
    "you're a business analyst",
  ]) {
    assert.equal(map(t).Role, true, `expected Role for: ${t}`);
  }
});

test("Role — negative", () => {
  assert.equal(map("Summarise this memo in five bullets").Role, false);
});

test("Context — needs length AND a context keyword", () => {
  const long =
    "The risk committee will review this before the meeting; the client is a 12 year relationship and the standard applies to the whole audience here.";
  assert.equal(map(long).Context, true);
  // keyword present but too short (<120 chars) → false
  assert.equal(map("client cfo committee").Context, false);
  // long but no keyword → false
  assert.equal(map("x".repeat(200)).Context, false);
});

test("Format — positive triggers", () => {
  for (const t of [
    "give me bullet points",
    "use this structure",
    "in the following format",
    "a numbered list",
    "as: 1) first 2) second",
  ]) {
    assert.equal(map(t).Format, true, `expected Format for: ${t}`);
  }
  assert.equal(map("write a nice reply").Format, false);
});

test("Constraints — positive triggers", () => {
  for (const t of [
    "under 180 words",
    "keep it under two pages",
    "neutral tone",
    "avoid jargon",
    "do not guess",
    "don't grovel",
  ]) {
    assert.equal(map(t).Constraints, true, `expected Constraints for: ${t}`);
  }
  assert.equal(map("explain this code").Constraints, false);
});

test("a fantastic prompt lights up all four", () => {
  const fantastic =
    "You are a senior credit risk analyst. The risk committee will read this pre-read. " +
    "Summarise the memo as: 1) snapshot 2) risks 3) recommendation. Under 180 words, neutral tone, do not guess.";
  const m = map(fantastic);
  assert.deepEqual(m, { Role: true, Context: true, Format: true, Constraints: true });
});

test("a bad prompt lights up none", () => {
  const m = map("Summarise this.");
  assert.deepEqual(m, { Role: false, Context: false, Format: false, Constraints: false });
});
