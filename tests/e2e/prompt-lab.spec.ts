import { test, expect, type Page, type BrowserContext, type Browser } from "@playwright/test";

// Multi-client E2E: one facilitator + independent participant browser contexts
// (each context gets its own localStorage → its own anonymous participant id).
// Flow order: lobby → Exercise 2 (Rate, gated) → Exercise 3 (Write).

const CODE = "4271";
const base = `http://localhost:${process.env.PL_PORT || "3100"}`;

async function reset(page: Page) {
  await page.request.post(`${base}/api/session/${CODE}/state`, { data: { action: "reset" } });
}

async function newParticipant(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/join/${CODE}`);
  return { ctx, page };
}

test("T9.1 happy path — join, rate (gated+sequential), reveal, then write+run (multi-client)", async ({ browser, page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await reset(fac);
  await fac.reload();

  // Two participants join (T1.2)
  const p1 = await newParticipant(browser);
  const p2 = await newParticipant(browser);
  await p1.page.getByTestId("join-btn").click();
  await p2.page.getByTestId("join-btn").click();
  await expect(p1.page.getByText("You're in")).toBeVisible();
  await expect(fac.getByTestId("participant-count")).toHaveText(/[12]/, { timeout: 8000 });

  // T6.1 — disclaimer on facilitator header
  await expect(fac.getByText("Synthetic scenarios only — no client or personal data")).toBeVisible();

  // ── Exercise 2.1 — RATE (starts hidden/gated) ──
  await fac.getByTestId("primary-control").click(); // "Start Exercise 2.1 →"
  // Prompts hidden on facilitator; participants wait
  await expect(fac.getByTestId("prompt-hidden").first()).toBeVisible({ timeout: 8000 });
  await expect(p1.page.getByText("Eyes on the big screen")).toBeVisible({ timeout: 8000 });
  await expect(fac.getByTestId("primary-control")).toHaveText("Show prompts");

  // Show prompts → gate opens on all devices (T3.x gate)
  await fac.getByTestId("primary-control").click();
  await expect(fac.getByTestId("prompt-hidden")).toHaveCount(0);
  await expect(p1.page.getByText("EXERCISE 2.1")).toBeVisible({ timeout: 8000 });
  await expect(p1.page.getByText("Prompt 1 of 4")).toBeVisible();

  // T4.x — sequential rating: four picks, each advances; auto-submits after the 4th
  await p1.page.getByTestId("rate-opt-ok").click();
  await expect(p1.page.getByText("Prompt 2 of 4")).toBeVisible();
  await p1.page.getByTestId("rate-opt-not").click();
  await expect(p1.page.getByText("Prompt 3 of 4")).toBeVisible();
  await p1.page.getByTestId("rate-opt-fa").click();
  await expect(p1.page.getByText("Prompt 4 of 4")).toBeVisible();
  await p1.page.getByTestId("rate-opt-ov").click();
  await expect(p1.page.getByText("Ratings in ✓")).toBeVisible();

  // T4.2 — aggregate reflected on facilitator
  await expect(fac.getByTestId("status-line")).toContainText(/rating/, { timeout: 8000 });

  // Reveal & debrief (T4.4 verdicts incl Overcooked, T4.5 anatomy, T2.4 participant flips)
  await fac.getByTestId("primary-control").click(); // "Reveal & debrief"
  await expect(fac.getByTestId("verdict-fant")).toHaveText("Fantastic");
  await expect(fac.getByTestId("verdict-over")).toHaveText("Overcooked");
  await expect(fac.getByTestId("verdict-bad")).toHaveText("Not so good");
  await expect(p1.page.getByText("The debrief")).toBeVisible({ timeout: 8000 });
  await expect(p1.page.getByText("Your takeaway — a fantastic prompt has:")).toBeVisible();
  await fac.getByTestId("anatomy-seg-role").click();
  await expect(fac.getByTestId("tip-text")).toContainText(/Role/);

  // ── Exercise 3.1 — WRITE ──
  await fac.getByRole("button", { name: /Write the prompt/ }).click();
  await fac.getByTestId("menu-item-3.1").click();
  await expect(p1.page.getByText("EXERCISE 3.1")).toBeVisible({ timeout: 8000 });

  // T3.1 + T3.3 — submit gated on length; chips light up for a fantastic prompt
  const ta = p1.page.getByTestId("write-textarea");
  await ta.fill("too short");
  await expect(p1.page.getByTestId("submit-prompt")).toBeDisabled();
  await ta.fill(
    "You are a senior leader preparing for the committee. Context: this quarterly review will be discussed in the meeting and you have three minutes. " +
      "Summarise it into exactly five numbered key takeaways, each decision-relevant. Keep it under 150 words, neutral tone, do not invent anything.",
  );
  await expect(p1.page.getByTestId("submit-prompt")).toBeEnabled();
  for (const chip of ["✓ Role", "✓ Context", "✓ Format", "✓ Constraints"]) {
    await expect(p1.page.getByText(chip)).toBeVisible();
  }
  await p1.page.getByTestId("submit-prompt").click();
  await expect(p1.page.getByText("Submitted ✓")).toBeVisible();

  // T3.2 + T3.4 + T3.5 — feed → spotlight → run streams
  const sub = fac.getByTestId("submission").first();
  await expect(sub).toBeVisible({ timeout: 8000 });
  await sub.click();
  await fac.getByTestId("run-claude").click();
  await expect(fac.getByTestId("spotlight-output")).toBeVisible({ timeout: 8000 });
  await expect(fac.getByTestId("spotlight-output")).toContainText(/Demo mode|Claude|prompt/i, { timeout: 8000 });

  // T2.5 — reset returns everyone to lobby
  await fac.getByText("Reset session").click();
  await expect(fac.getByText("Rate the prompts").first()).toBeVisible();
  await expect(p1.page.getByText("You're in")).toBeVisible({ timeout: 8000 });

  await p1.ctx.close();
  await p2.ctx.close();
});

test("T1.4 late join — a phone joining mid-session lands on the live exercise", async ({ browser, page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await reset(fac);
  await fac.reload();
  // Advance to Write 3.2 before anyone joins.
  await fac.getByRole("button", { name: /Write the prompt/ }).click();
  await fac.getByTestId("menu-item-3.2").click();
  await expect(fac.getByText(/The ask/)).toBeVisible();

  const p = await newParticipant(browser);
  await p.page.getByTestId("join-btn").click();
  await expect(p.page.getByText("EXERCISE 3.2")).toBeVisible({ timeout: 8000 });
  await expect(p.page.getByText("You're in")).toHaveCount(0);
  await p.ctx.close();
});

test("T7.3 — facilitator can pop a scannable join-QR overlay (header QR removed)", async ({ page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await fac.getByTestId("show-qr").click();
  const overlay = fac.getByTestId("qr-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay.locator("img")).toBeVisible(); // real generated QR image
  await fac.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
});

test("Key takeaways overlay — link next to Reset opens takeaways + PDF download", async ({ page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await fac.getByTestId("key-takeaways-link").click();
  const ov = fac.getByTestId("takeaways-overlay");
  await expect(ov).toBeVisible();
  await expect(ov.getByText("The six-part anatomy of a great prompt")).toBeVisible();
  await expect(ov.getByText("Tone is a business control, not a nicety")).toBeVisible();
  // Download link points at the served PDF, which must exist (200).
  const href = await fac.getByTestId("download-pdf").getAttribute("href");
  expect(href).toBe("/key-takeaways.pdf");
  const pdf = await fac.request.get(`${base}/key-takeaways.pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("pdf");
  await fac.keyboard.press("Escape");
  await expect(ov).toHaveCount(0);
});

test("Document flash — facilitator flashes the scenario document onto every device", async ({ browser, page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await reset(fac);
  await fac.reload();
  await fac.getByRole("button", { name: /Write the prompt/ }).click();
  await fac.getByTestId("menu-item-3.1").click();

  const p = await newParticipant(browser);
  await p.page.getByTestId("join-btn").click();
  await expect(p.page.getByText("EXERCISE 3.1")).toBeVisible({ timeout: 8000 });

  // Flash the document
  await fac.getByTestId("toggle-doc").click();
  await expect(fac.getByTestId("document-overlay")).toBeVisible();
  await expect(fac.getByTestId("document-overlay")).toContainText(/Quarterly Review/);
  // …it appears on the participant device too
  await expect(p.page.getByTestId("doc-overlay")).toBeVisible({ timeout: 8000 });
  await expect(p.page.getByTestId("doc-overlay")).toContainText(/Quarterly Review/);

  // Take it down (Esc) → clears everywhere
  await fac.keyboard.press("Escape");
  await expect(fac.getByTestId("document-overlay")).toHaveCount(0);
  await expect(p.page.getByTestId("doc-overlay")).toHaveCount(0, { timeout: 8000 });
  await p.ctx.close();
});

test("Document flash (rate) — facilitator flashes the credit memo onto every device", async ({ browser, page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await reset(fac);
  await fac.reload();
  await fac.getByRole("button", { name: /Rate the prompts/ }).click();
  await fac.getByTestId("menu-item-2.1").click();

  const p = await newParticipant(browser);
  await p.page.getByTestId("join-btn").click();
  await expect(p.page.getByText("Eyes on the big screen")).toBeVisible({ timeout: 8000 });

  // Flash the artefact (credit memo)
  await fac.getByTestId("toggle-doc").click();
  await expect(fac.getByTestId("document-overlay")).toBeVisible();
  await expect(fac.getByTestId("document-overlay")).toContainText(/Meridian Textiles/);
  // …it appears on the participant device too, even mid-rating-wait
  await expect(p.page.getByTestId("doc-overlay")).toBeVisible({ timeout: 8000 });
  await expect(p.page.getByTestId("doc-overlay")).toContainText(/Meridian Textiles/);

  await fac.keyboard.press("Escape");
  await expect(fac.getByTestId("document-overlay")).toHaveCount(0);
  await expect(p.page.getByTestId("doc-overlay")).toHaveCount(0, { timeout: 8000 });
  await p.ctx.close();
});

test("T1.3 invalid code — clear 404, no crash", async ({ page }) => {
  const res = await page.goto(`${base}/join/9999`);
  expect(res?.status()).toBe(404);
});

test("T6.1 disclaimer + join QR visible on participant join screen", async ({ browser }) => {
  const p = await newParticipant(browser);
  await expect(
    p.page.getByText("Please don't enter client, personal or confidential data. All scenarios are synthetic."),
  ).toBeVisible();
  await expect(p.page.getByText("or enter code")).toBeVisible();
  await p.ctx.close();
});

test("T7.7 animated background does not intercept clicks", async ({ page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  const pe = await fac.evaluate(() => {
    const bg = document.querySelector('[aria-hidden="true"]') as HTMLElement | null;
    return bg ? getComputedStyle(bg).pointerEvents : "missing";
  });
  expect(pe).toBe("none");
  await fac.getByTestId("primary-control").click();
  await expect(fac.getByTestId("primary-control")).toBeVisible();
});
