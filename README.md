# Prompt Lab — Prompting for Leadership

An interactive, facilitator-led workshop app for a "Prompting for Leadership" session
inside a Demystifying AI seminar. A facilitator drives a projected screen; participants
join from their phones via QR + a 4-digit session code (no login). The session runs two
hands-on exercises, each with three realistic **synthetic** banking scenarios:

- **Exercise 2.x — Write the prompt.** The facilitator projects a task + reference
  artefact; participants write the prompt they'd give an AI assistant; submissions stream
  to the projected screen; the facilitator spotlights one and runs it against Claude live.
- **Exercise 3.x — Rate the prompts.** Three pre-written prompts (bad / okay / fantastic,
  order varies) per task; participants rate each; live aggregate bars; a **Reveal & debrief**
  shows verdicts and a colour-coded anatomy of the fantastic prompt (Role · Context · Task ·
  Format · Constraints/Tone · Examples).

Built from the design handoff in [`project/`](./project) (the original HTML prototype,
requirements brief and design notes). See [`project/design_handoff_prompt_lab`](./project/design_handoff_prompt_lab)
for the source of truth on copy, colours and behaviour.

## Stack

- **Next.js 14** (App Router) + TypeScript, React 18.
- **Server-side Claude proxy** — the Anthropic key lives only in server env; the browser
  never sees it. Responses stream (SSE → plain-text) to the UI.
- **Realtime session state** via a small KV layer: **Upstash Redis / Vercel KV** in
  production, with an in-memory fallback for local dev. Clients poll ~1.5s so it survives
  flaky venue Wi-Fi (no websocket server to babysit).

## Routes

| Route            | Who          | What                                                            |
| ---------------- | ------------ | -------------------------------------------------------------- |
| `/`              | anyone       | Landing — open the facilitator screen or join as a participant |
| `/facilitate`    | facilitator  | The projected screen: stepper, lobby, both exercises, controls |
| `/join/[code]`   | participants | Mobile web page that follows the live exercise                 |

### API

| Endpoint                          | Method | Purpose                                             |
| --------------------------------- | ------ | --------------------------------------------------- |
| `/api/session/[code]/state`       | GET    | Poll the live snapshot (+ participant heartbeat)    |
| `/api/session/[code]/state`       | POST   | Facilitator controls: `goto` / `reveal` / `reset`   |
| `/api/session/[code]/submit`      | POST   | Participant submits (or edits) their prompt         |
| `/api/session/[code]/rate`        | POST   | Participant submits their rating set (idempotent)   |
| `/api/claude`                     | POST   | Streaming Claude proxy (rate-limited per participant)|

## Getting started

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (and Upstash creds for real realtime)
npm run dev                  # http://localhost:3000
```

Open `/facilitate` on the projector and `/join/4271` on phones. Without an
`ANTHROPIC_API_KEY` the Claude proxy runs in a graceful **demo mode** (streams a
placeholder) so the app is fully clickable before a key is provisioned. Without Upstash
credentials the session store is in-memory (fine for a single instance / local demo).

### Environment variables

| Variable                                            | Required | Notes                                              |
| --------------------------------------------------- | -------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY`                                 | for live | Server-side only. Absent → demo mode.              |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN`              | for scale| Or Vercel KV's `KV_REST_API_URL` / `..._TOKEN`.    |
| `NEXT_PUBLIC_BASE_URL`                              | optional | Fallback base for the QR join URL.                 |

## Guardrails (Responsible AI)

- Prominent "synthetic scenarios only — no client or personal data" disclaimer on the
  facilitator header (every phase) and the participant join screen.
- The banking-appropriate system prompt is attached **server-side** and cannot be
  overridden by a client payload.
- Server-side input length cap and per-participant run limits (3 / scenario).
- No persistence beyond the session — an auto-expiring store, no accounts, no personal
  data, no third-party trackers.

## Testing

An automated test suite lives in [`tests/`](./tests), mapped to `project/design_handoff_prompt_lab/TEST_PLAN.md`:

```bash
npm run test:unit   # heuristic + pure-logic unit tests (node:test)
npm run test:api    # API-level integration tests against a running server
npm run test:e2e    # Playwright multi-client E2E (facilitator + participants)
```

See [`tests/README.md`](./tests/README.md) for the case-by-case coverage matrix.

## Deploying to Vercel

1. Import the repo; framework preset **Next.js**.
2. Set `ANTHROPIC_API_KEY` and Upstash/Vercel KV env vars.
3. Deploy. The QR encodes `https://<host>/join/4271`.
