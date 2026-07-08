# Change Brief — Prompt Lab design updates (since last handoff)

The included `Prompt Lab v2.dc.html` is the updated source of truth. Apply these changes to the existing Next.js app and commit.

## 1. Exercises swapped
- **Exercise 2 is now "Rate the prompts"** (scenarios 2.1 Credit memo summary, 2.2 Requirements summary, 2.3 Code modernisation).
- **Exercise 3 is now "Write the prompt"** (3.1 Client escalation email, 3.2 Requirements document, 3.3 Legacy code modernisation).
- Session flow: lobby → 2.1 → 2.2 → 2.3 → 3.1 → 3.2 → 3.3. Stepper order, dropdown numbering, lobby preview cards and all "Next →" buttons follow this order.

## 2. Rate the prompts: 4 prompts + "Overcooked" rating
- Each rating scenario now has **four prompts (A–D)**; new tier `over` ("Overcooked") added alongside bad/okay/fantastic. Prompt D content per scenario is in the design file (`EX2_SCEN`).
- Rating options everywhere are: Not so good `#FF7A90`, Okay `#FFB547`, Fantastic `#33E0A0`, **Overcooked `#FF8E3C`**.
- Facilitator screen: 4-column prompt grid; aggregate bars include the Overcooked row; verdict chips on reveal include Overcooked.
- **Ordering rule: the longest prompt text must always be position A or B** in every scenario (currently 2.1→A, 2.2→B, 2.3→A).

## 3. Rate the prompts: "Show prompts" gate
- Prompts start **hidden** when a rating scenario opens: facilitator cards show a "Hidden — reveal when ready" placeholder; participants see a waiting screen.
- New primary-button step on facilitator: **Show prompts** → prompts appear on screen AND rating opens on participant devices → then **Reveal & debrief** as before.
- State: `promptsShown` boolean per scenario, reset on scenario switch.

## 4. Participant rating is sequential
- Participants rate prompts **one at a time** (A → B → C → D), each appearing after the previous is rated; progress bar "Prompt N of 4" with per-prompt dots.
- Tapping a rating locks it and advances; after the 4th, ratings auto-submit (no separate submit button).

## 5. QR placement changes
- **Removed** the QR from the top header ribbon — now a compact "Session 4271 · N joined" pill only.
- **Removed** the lobby's left "Join on your phone" QR panel; lobby is a single column (Exercise 2 card, Exercise 3 card, participant counter).
- The join QR now lives **on the participant join page**: 180px QR centered, "or enter code" + 4 digit boxes underneath. (In the real app the join page is reached by URL, so the QR there is mainly for passing a neighbour's phone — keep it, but ALSO ensure the facilitator can show a QR when needed; a keyboard shortcut or menu item to pop a QR overlay on the projected screen is a sensible addition since the header QR is gone.)
- QR must encode the real join URL (`/join/<code>`), generated per session.

## 6. Visual refresh (already in the design file)
- Glassy panels: `rgba(18,41,68,0.62)` + 14px backdrop blur; insets `rgba(8,24,42,0.72)`.
- Primary buttons: gradient `#1E49E2 → #0090E0` with glow shadow.
- Display font: **Space Grotesk** (700, −0.01em) for headings/badges; Public Sans for body.
- Lighter animated background: gradient `#0D2138 → #123054 → #163A64`, sliding dot grid, 3 drifting glow orbs, 2 sweeping light beams, ~28 glowing particles drifting up AND down (random speed/sway/twinkle).
- Easter egg: Ferrari-style red car crosses the bottom every 15s with random reverse. Optional.

## 7. Tests to update (TEST_PLAN.md)
- T4.x: four prompts, four rating options, sequential participant flow, promptsShown gate (participants cannot rate before Show prompts — enforce server-side).
- T2.x: phase sync includes the hidden→shown→revealed sub-states.
- T7.3: header QR test replaced by join-page QR test.
