# Handoff: Prompt Lab — Prompting for Leadership workshop app

## Overview
Prompt Lab is an interactive, facilitator-led web app for a "Prompting for Leadership" session inside a Demystifying AI seminar for ~30–40 senior commercial-banking leaders (India). A facilitator projects a main screen; participants join from their phones via QR + 4-digit session code (no login). The session runs two hands-on exercises, each with three banking scenarios:

- **Exercise 2.x — Write the prompt**: facilitator projects a realistic task + reference artefact; participants write the prompt they'd give an AI assistant on their phone; submissions stream to the projected screen; the facilitator spotlights submissions and runs them against the Claude API live.
- **Exercise 3.x — Rate the prompts**: three pre-written prompts (bad / okay / fantastic, order varies) for the same task; participants rate each on their phones; live aggregate bars on the projected screen; a "Reveal & debrief" shows verdicts and a colour-coded anatomy of the fantastic prompt (Role, Context, Task, Format, Constraints/Tone, Examples).

Full product requirements are in `prompt-lab-requirements.md` (included) — deployment on Vercel/Next.js, serverless Claude proxy, realtime layer, rate limits, guardrails, non-persistence.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing intended look and behavior, NOT production code to copy directly. The task is to **recreate this design as a real multi-user app** per the requirements brief (Next.js on Vercel, server-side Anthropic API key, realtime session state via e.g. Vercel KV/Upstash polling or Pusher/Ably). In the prototype, facilitator + participant views share one page and one in-memory state; in the real app they are separate routes (`/facilitate`, `/join/[code]`) synchronized over the realtime layer.

- `Prompt Lab v2.dc.html` — the design source (custom single-file component format). All markup is inline-styled HTML inside `<x-dc>`; all behavior/data is in the `class Component` script at the bottom. **Read it for exact copy, colors, layout and the full scenario/prompt content** (all six scenarios, fake submissions, rating targets, anatomy segments, heuristic prompt checks, Claude system prompt).
- `ios-frame.jsx` — iPhone bezel used only to present the participant view in the prototype. Not part of the product; the participant UI is a plain mobile web page (~375–430px).

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy and interactions are final intent. Recreate pixel-close using the codebase's stack (Tailwind/CSS-in-JS as established). The iPhone bezel and the simulated crowd (auto-arriving participants, fake submissions, fake ratings) are prototype-only devices — replace with real multi-user behavior.

## Screens / Views

### Shared chrome (facilitator, all phases)
- Full-viewport dark app. Animated background (fixed, behind everything): base `linear-gradient(160deg, #081527, #0A1B30 45%, #0C1F3E)`; sliding dot grid (`radial-gradient(rgba(120,170,230,0.10) 1px, transparent 1.5px)`, 28px cell, 60s linear loop); three blurred drifting glow orbs (blue `rgba(30,73,226,0.28)`, cyan `rgba(0,184,245,0.16)`, violet `rgba(159,123,255,0.13)`, blur 50–60px, 26–38s ease-in-out loops); occasional diagonal light-beam sweep (18s). Plus a decorative easter egg: a ~74px CSS-drawn car driving right→left along the bottom every 15s, randomly reversing briefly (wheels reverse spin) — optional, keep if cheap.
- Header (glass): `rgba(8,21,39,0.55)` + 14px backdrop blur, bottom border `rgba(0,184,245,0.22)`. Left: 34px logo chip (gradient `#1E49E2→#0090E0`, radius 10, "PL"), title "Prompt Lab" 17px/700 + subtitle 12px `#93A9C6`. Right: **persistent join card** — 42px white QR tile + "Session 4271 · N joined" (13px/700 `#ACEAFF`, pulsing green dot `#33E0A0`) + caption "Scan any time to join — your phone lands on the live exercise"; and an amber disclaimer pill "Synthetic scenarios only — no client or personal data" (`rgba(255,181,71,0.12)` bg, `#FFB547` text, 12px/600). The QR must always be visible on every phase; late joiners land on the live exercise.

### Facilitator: stepper + navigation
Row of pill buttons: "1 · Lobby", "2 · Write the prompt ▾", "3 · Rate the prompts ▾", right-aligned "Reset session". Active pill: gradient `#1E49E2→#0090E0`, white text; inactive: transparent, `#93A9C6` text, border `rgba(140,170,210,0.3)`. Buttons 2 and 3 open a dropdown (absolute, `rgba(18,41,68,…)` panel, radius 12, shadow `0 12px 32px rgba(0,0,0,0.45)`) listing sub-scenarios with numbered prefixes: 2.1 Client escalation email / 2.2 Requirements document / 2.3 Legacy code modernisation, and 3.1 Credit memo summary / 3.2 Requirements summary / 3.3 Code modernisation. Selecting one switches every connected device to that exercise and resets its per-exercise state. A bottom control bar holds one contextual primary button ("Start Exercise 2.1 →", "Next: 2.2 Requirements document →", … "Reveal & debrief", "Back to lobby") + a status line ("N prompts submitted", "N ratings received").

### Facilitator: Lobby
Two-column grid (1fr / 1.3fr). Left card: "JOIN ON YOUR PHONE" label (13px/700 uppercase `#00B8F5`), 148px white QR tile, 4 code-digit boxes (44×52, radius 10, border `rgba(0,184,245,0.4)`, digits 24px/700 `#ACEAFF`), caption. Right: two exercise-preview cards (label 12px caps in `#00B8F5` / `#9F7BFF`, title 19px/700, body 14px `#C9D8EC`) + green participant counter strip (`rgba(51,224,160,0.07)` bg, count 26px/700 `#33E0A0`).

### Facilitator: Exercise 2.x (Write the prompt)
- "The ask" card: label `2.x · THE ASK` (11px caps `#00B8F5`), ask text 15px `#C9D8EC`, artefact block below in a darker inset (`rgba(8,24,42,0.72)`, 12.5px `#93A9C6`, `white-space: pre-wrap` — the legacy-code artefact relies on it).
- Two-column grid (1fr / 1.2fr):
  - **Submissions feed**: header "SUBMISSIONS" + green count + hint "tap one to spotlight". Each submission is a tappable card (name 11px/700 `#00B8F5`, text 13px `#C9D8EC`, radius 12, slide-in animation ~0.35s); selected card gets cyan border + `rgba(0,184,245,0.08)` bg. Empty state: dashed-border "Waiting for prompts from the room…".
  - **Spotlight panel** (cyan border `rgba(0,184,245,0.35)`): participant name + four heuristic check chips (Role/Context/Format/Constraints — green `✓` chip when detected, muted `·` otherwise; regexes in the prototype's `checksFor()`), the prompt at 15px on an inset, "Run with Claude ▸" gradient button + "claude-sonnet · live call" caption, then the output card (13px/1.65, pre-wrap, max-height 320px scroll) with a blinking cyan caret while streaming. Empty state: dashed placeholder.

### Facilitator: Exercise 3.x (Rate the prompts)
- Artefact card as above (label in `#9F7BFF`).
- Three equal prompt cards: "Prompt A/B/C" chip (violet `rgba(159,123,255,0.15)` / `#C9B4FF`), prompt text 13.5px, and three aggregate bars (Not so good `#FF7A90` / Okay `#FFB547` / Fantastic `#33E0A0`; 7px tall, rounded, width animated 0.4s, count at right). Bars fill live as ratings arrive.
- After **Reveal & debrief**: verdict chips appear on each card (Not so good / Okay / Fantastic in matching tinted chips); the fantastic card's border turns green; an **Anatomy panel** slides in: the fantastic prompt rendered as six tappable highlighted segments (background = component colour at ~18% alpha, 2px underline in full colour), a legend row of six chips, and a one-line explainer that updates when a segment/legend chip is tapped.

### Participant (mobile web, ~375–430px)
Dark (#0A1B30) mobile page; screens are driven by the live session phase:
1. **Join**: logo, "Join the Prompt Lab" 26px/700, code entry (real app: 4-digit input), primary button, amber disclaimer card.
2. **Lobby**: pulsing dot, "You're in", waiting copy.
3. **Write** (Ex 2.x): exercise label + scenario name, ask card, textarea (min 150px), live heuristic check chips (same `checksFor`), helper line, "Submit to the screen" (disabled at <10 chars → 0.45 opacity).
4. **Submitted**: "Submitted ✓", then "Run it yourself" — participant can run their own prompt against Claude, "N runs left" (3 per scenario), output card, "‹ Edit my prompt".
5. **Rate** (Ex 3.x): three prompt cards, each with a 3-way segmented pick (Not so good / Okay / Fantastic; selected = tinted bg + colour border), "Submit ratings" enabled once all three are picked.
6. **Done / Debrief**: "Ratings in ✓" waiting state; on reveal → "The debrief" + the six-component takeaway list (colour swatch, name, one-liner each).

Content top padding on non-centered phone screens: 68px (below status bar in the prototype; use safe-area insets in the real app).

## Interactions & Behavior
- **Realtime sync**: facilitator phase/scenario changes broadcast to all participants instantly; participant screens derive purely from (phase, scenarioId, personal state). Scenario switch resets submissions/ratings for that exercise.
- **Claude runs**: prompt sent as user message + `\n\n---\nREFERENCE MATERIAL (synthetic):\n` + scenario artefact; system prompt (verbatim in the prototype's `SYS`) instructs professional banking output and — importantly — to honour weak prompts weakly. Model `claude-sonnet-4-6` per requirements, `max_tokens` ~700, streamed to the screen (prototype fakes streaming with a typewriter + blinking caret; real app should use SSE streaming). Per-participant limit: 3 runs per scenario. Graceful error text on failure.
- **Voting/ratings**: one rating set per participant per scenario; aggregates update live with 0.4s width transitions.
- Buttons: hover lightens bg (`#2B57F0` on primary) or brightens border; disabled = 0.45–0.55 opacity, no pointer effect.
- Animations: `slideIn` (6px rise + fade, 0.35–0.4s) for arriving submissions and the anatomy panel; `pulseDot` 2s; `blinkCaret` 0.9s.

## State Management
Session (shared): `phase` (lobby | ex1 | ex2), `ex1Idx`/`ex2Idx` (0–2), `revealed`, participant count, submissions[] {name, text}, ratings per prompt {not, ok, fa}, spotlighted submission + its output. Per participant: joined, myText, mySubmitted, myRuns, myRatings[3], myRated. No persistence beyond the session (auto-expiring store); fresh session code per event.

## Design Tokens
- **Colors** — bg base `#0A1B30` / gradient `#081527→#0C1F3E`; panel glass `rgba(18,41,68,0.62)` + blur 14px; inset `rgba(8,24,42,0.72)`; borders `rgba(140,170,210,0.22)` (accent cyan `rgba(0,184,245,0.35)`); text `#E8F0FA`, secondary `#C9D8EC`, muted `#93A9C6`; brand blue `#1E49E2`, gradient end `#0090E0`; cyan `#00B8F5`, light cyan `#ACEAFF`; violet `#9F7BFF` / `#C9B4FF`; green `#33E0A0` / `#7FF0C4`; amber `#FFB547` / `#FFCB7A`; red `#FF7A90` / `#FF9DAD`.
- **Anatomy colours** — Role `#00B8F5`, Context `#9F7BFF`, Task `#63E6BE`, Format `#FFB547`, Constraints/Tone `#FF7A90`, Examples `#ACEAFF`.
- **Type** — body: Public Sans (400–700); display/headings & badges: Space Grotesk 700, letter-spacing −0.01em. Scale: 26/22/19/17/15/14/13/12/11px; uppercase labels 11–13px, +1–1.2px tracking.
- **Radius** — pills 999px; cards 14–16px; insets 10–12px; buttons 10–12px.
- **Shadows** — panels `0 10px 34px rgba(2,8,18,0.35)`; primary buttons `0 4px 18px rgba(0,144,224,0.35)`; dropdown `0 12px 32px rgba(0,0,0,0.45)`.
- **Spacing** — page padding 20–28px; grid gaps 14px; card padding 16–28px; control gaps 8–10px.

## Assets
None external. QR is a placeholder pattern in the prototype — generate a real QR (session join URL) server-side. Fonts from Google Fonts (Public Sans, Space Grotesk). Icons are typographic (▾, ▸, ‹, ✓, ·).

## Files
- `Prompt Lab v2.dc.html` — full design + all content/data + behavior (read `class Component` for scenario data, prompt sets, anatomy segments, heuristics, system prompt, simulation logic to discard).
- `ios-frame.jsx` — presentation bezel only, not product.
- `prompt-lab-requirements.md` — original product requirements brief (architecture, guardrails, NFRs, out of scope).
