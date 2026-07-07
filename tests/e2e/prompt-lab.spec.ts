import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// Multi-client E2E: one facilitator + independent participant browser contexts
// (each context gets its own localStorage → its own anonymous participant id).

const CODE = "4271";
const base = `http://localhost:${process.env.PL_PORT || "3100"}`;

async function reset(page: Page) {
  await page.request.post(`${base}/api/session/${CODE}/state`, { data: { action: "reset" } });
}

async function newParticipant(browser: import("@playwright/test").Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/join/${CODE}`);
  return { ctx, page };
}

test("T9.1 happy path — join, write, spotlight+run, rate, reveal, reset (multi-client)", async ({ browser, page: fac }) => {
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

  // T6.1 — disclaimer present on facilitator header and participant join
  await expect(fac.getByText("Synthetic scenarios only — no client or personal data")).toBeVisible();

  // Facilitator → Exercise 2.1 ; participants switch to write (T2.1)
  await fac.getByTestId("primary-control").click(); // "Start Exercise 2.1 →"
  await expect(p1.page.getByText("EXERCISE 2.1")).toBeVisible({ timeout: 8000 });

  // T3.1 + T3.3 — submit disabled short; chips light up for a fantastic prompt
  const ta = p1.page.getByTestId("write-textarea");
  await ta.fill("too short");
  await expect(p1.page.getByTestId("submit-prompt")).toBeDisabled();
  const fantastic =
    "You are an experienced relationship manager. Context: a 12-year client, two payroll failures, the CFO escalated. " +
    "Draft a reply email as a numbered list of the three fixes with dates. Keep it under 200 words, warm tone, no jargon.";
  await ta.fill(fantastic);
  await expect(p1.page.getByTestId("submit-prompt")).toBeEnabled();
  for (const chip of ["✓ Role", "✓ Context", "✓ Format", "✓ Constraints"]) {
    await expect(p1.page.getByText(chip)).toBeVisible();
  }
  await p1.page.getByTestId("submit-prompt").click();
  await expect(p1.page.getByText("Submitted ✓")).toBeVisible();

  // T3.2 + T3.4 — submission reaches facilitator feed; spotlight shows text + chips
  const sub = fac.getByTestId("submission").first();
  await expect(sub).toBeVisible({ timeout: 8000 });
  await sub.click();
  await expect(fac.getByTestId("spotlight-output")).toHaveCount(0); // not run yet
  await expect(fac.getByText("✓ Role").first()).toBeVisible();

  // T3.5 — Run with Claude streams output (demo mode)
  await fac.getByTestId("run-claude").click();
  await expect(fac.getByTestId("spotlight-output")).toBeVisible({ timeout: 8000 });
  await expect(fac.getByTestId("spotlight-output")).toContainText(/Demo mode|Claude|prompt/i, { timeout: 8000 });

  // T2.2 — switch 2.1 → 2.2 resets participant write (textarea cleared)
  await fac.getByRole("button", { name: /Write the prompt/ }).click();
  await fac.getByTestId("menu-item-2.2").click();
  await expect(p1.page.getByText("EXERCISE 2.2")).toBeVisible({ timeout: 8000 });
  await expect(p1.page.getByTestId("write-textarea")).toHaveValue("");

  // Move to Exercise 3.1 (rate). Navigate via the dropdown.
  await fac.getByRole("button", { name: /Rate the prompts/ }).click();
  await fac.getByTestId("menu-item-3.1").click();
  // T2.3 — participants see the rating screen
  await expect(p1.page.getByText("EXERCISE 3.1")).toBeVisible({ timeout: 8000 });

  // T4.1 — submit disabled until all three rated
  await expect(p1.page.getByTestId("submit-ratings")).toBeDisabled();
  await p1.page.getByTestId("rate-0-ok").click();
  await p1.page.getByTestId("rate-1-not").click();
  await p1.page.getByTestId("rate-2-fa").click();
  await expect(p1.page.getByTestId("submit-ratings")).toBeEnabled();
  await p1.page.getByTestId("submit-ratings").click();
  await expect(p1.page.getByText("Ratings in ✓")).toBeVisible();

  // T4.2 — aggregate reflects the rating on the facilitator screen
  await expect(fac.getByTestId("status-line")).toContainText(/rating/, { timeout: 8000 });

  // Reveal & debrief (T4.4 verdicts, T4.5 anatomy, T2.4 participant flips)
  await fac.getByTestId("primary-control").click(); // "Reveal & debrief"
  await expect(fac.getByTestId("verdict-fant")).toHaveText("Fantastic");
  await expect(fac.getByTestId("verdict-bad")).toHaveText("Not so good");
  await expect(p1.page.getByText("The debrief")).toBeVisible({ timeout: 8000 });
  await expect(p1.page.getByText("Your takeaway — a fantastic prompt has:")).toBeVisible();

  // T4.5 — tapping an anatomy segment shows its explainer
  await fac.getByTestId("anatomy-seg-role").click();
  await expect(fac.getByTestId("tip-text")).toContainText(/Role/);

  // T2.5 — reset returns everyone to lobby
  await fac.getByText("Reset session").click();
  await expect(fac.getByText("Join on your phone")).toBeVisible();
  await expect(p1.page.getByText("You're in")).toBeVisible({ timeout: 8000 });

  await p1.ctx.close();
  await p2.ctx.close();
});

test("T1.4 late join — a phone joining mid-session lands on the live exercise", async ({ browser, page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  await reset(fac);
  await fac.reload();
  // Facilitator advances to Exercise 2.2 before anyone joins.
  await fac.getByRole("button", { name: /Write the prompt/ }).click();
  await fac.getByTestId("menu-item-2.2").click();
  await expect(fac.getByText(/The ask/)).toBeVisible();

  const p = await newParticipant(browser);
  await p.page.getByTestId("join-btn").click();
  // Lands directly on 2.2 write, not the lobby.
  await expect(p.page.getByText("EXERCISE 2.2")).toBeVisible({ timeout: 8000 });
  await expect(p.page.getByText("You're in")).toHaveCount(0);
  await p.ctx.close();
});

test("T1.3 invalid code — clear 404, no crash", async ({ page }) => {
  const res = await page.goto(`${base}/join/9999`);
  expect(res?.status()).toBe(404);
});

test("T6.1 disclaimer visible on participant join screen", async ({ browser }) => {
  const p = await newParticipant(browser);
  await expect(
    p.page.getByText("Please don't enter client, personal or confidential data. All scenarios are synthetic."),
  ).toBeVisible();
  await p.ctx.close();
});

test("T7.7 animated background does not intercept clicks", async ({ page: fac }) => {
  await fac.goto(`${base}/facilitate`);
  // The fixed background layer must be pointer-events:none and sit behind content.
  const pe = await fac.evaluate(() => {
    const bg = document.querySelector('[aria-hidden="true"]') as HTMLElement | null;
    return bg ? getComputedStyle(bg).pointerEvents : "missing";
  });
  expect(pe).toBe("none");
  // And the primary control is actually clickable.
  await fac.getByTestId("primary-control").click();
  await expect(fac.getByTestId("primary-control")).toBeVisible();
});
