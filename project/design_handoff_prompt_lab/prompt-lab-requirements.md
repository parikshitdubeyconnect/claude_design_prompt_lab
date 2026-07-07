# Prompt Lab — Requirements Brief for Claude Code

## 1. Purpose & Context
- Interactive web app for a "Prompting for Leadership" hands-on session within a Demystifying AI seminar for ~40 senior leaders from a large bank's commercial banking team (India).
- Goal: demonstrate, live and collaboratively, the difference between **bad, okay, and fantastic prompts** on realistic banking tasks.
- Deployed on **Vercel**; facilitator-led from a projected screen; participants join from their own phones/laptops.

## 2. Users & Modes
- **Facilitator mode** (Parikshit / KPMG presenter): controls which scenario is live, pushes prompts to the screen, reveals outputs, shows aggregate votes.
- **Participant mode**: join via QR code + 4-digit session code (no login, no email capture). Mobile-first UI. Up to 40 concurrent users.

## 3. Core Features

### 3.1 Scenario Library (pre-loaded, banking-flavoured, no real client data)
Each scenario has a business task plus three pre-written prompts (bad / okay / fantastic):
1. Summarise a (synthetic) credit memo for a risk committee.
2. Draft a client email responding to a service escalation.
3. Turn messy meeting notes into structured actions and owners.
4. Explain a regulatory change (e.g. a synthetic circular) to a non-specialist team.
5. Generate interview questions for hiring a data analyst.
6. Free-form scenario the facilitator can type live.

### 3.2 Three-Tier Prompt Comparison
- Side-by-side view: Bad | Okay | Fantastic prompt cards.
- On facilitator trigger, each prompt is sent to the Claude API (claude-sonnet-4-6) and outputs stream side by side.
- Blind mode option: outputs shown first, prompts hidden; participants vote on which output is best before the prompts are revealed.

### 3.3 Prompt Anatomy Annotation
- The "fantastic" prompt can be toggled to highlight its components with colour-coded labels mapped to the session's prompt framework: **Role, Context, Task, Format, Constraints/Tone, Examples**.
- Hover/tap on a label shows a one-line explanation.

### 3.4 Participant Interaction
- **Vote**: participants rate each output (1–5 stars or best-of-three pick); live aggregate bar shown on the facilitator screen.
- **Try it yourself**: participants can rewrite the prompt for the current scenario and run it against Claude (rate-limited, e.g. 3 runs per participant per scenario).
- **Gallery**: facilitator can surface 2–3 selected participant prompts + outputs on the main screen for discussion.

### 3.5 Facilitator Dashboard
- Scenario selector, start/reveal controls, vote reset, participant count, ability to spotlight participant submissions, and a "session pace" view.

## 4. Guardrails & Responsible AI (ties into the governance agenda item)
- Prominent disclaimer: **do not enter client, personal, or confidential data** — synthetic scenarios only.
- Input length limits and basic content filtering on participant prompts.
- System prompt on all API calls constrains outputs to professional, banking-appropriate content.
- No persistence of participant inputs beyond the session (in-memory or auto-expiring store); no analytics/tracking of individuals.

## 5. Non-Functional Requirements
- Next.js on Vercel; Anthropic API key held server-side in environment variables (never exposed to client).
- Serverless API routes proxy all Claude calls; per-session and per-user rate limits.
- Streaming responses for perceived speed; graceful error/timeout handling on flaky venue Wi-Fi.
- Works on corporate-managed browsers (no extensions, no downloads); responsive down to ~375px width.
- Session state via a lightweight realtime layer (e.g. Vercel KV/Upstash + polling or Pusher/Ably) — Claude Code to choose the simplest reliable option.
- Single shared session; a fresh session code can be generated per event so the app is reusable for future client workshops.

## 6. Nice-to-Haves (build if time permits)
- Prompt "score" heuristic (checks for role, context, format instructions) shown as instant feedback when participants write their own.
- Downloadable one-page takeaway: the prompt framework + the fantastic prompts from the session.
- KPMG-style theming (dark blue palette, clean sans-serif) without logos hard-coded.

## 7. Out of Scope
- Authentication, user accounts, data retention, multi-tenant admin, fine-tuning, file uploads.
