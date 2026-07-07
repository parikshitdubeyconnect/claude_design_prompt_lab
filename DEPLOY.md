# Deploying Prompt Lab to Vercel

This runbook lets a Claude Code session (or you) deploy the app via the Vercel CLI.

## Prerequisite: network egress

The Vercel CLI must reach **`api.vercel.com`**. In Claude Code on the web the
network egress policy is fixed when a session starts, so:

1. In the environment's settings, allow `api.vercel.com` (broaden the egress
   allowlist / choose a policy that permits it).
2. Start a **fresh session** on this repo so the new policy is in effect.
3. Verify from a shell: `curl -s -o /dev/null -w '%{http_code}\n' https://api.vercel.com/v2/user`
   should be `401` (reachable) rather than `403 Host not in allowlist`.

The deployed app reaches Upstash from Vercel's own network, so the Upstash host
does **not** need to be allowlisted in the sandbox — only `api.vercel.com`.

## Secrets needed (provide at deploy time — never commit)

| Env var                    | What                                             |
| -------------------------- | ------------------------------------------------ |
| `ANTHROPIC_API_KEY`        | Anthropic key (server-side Claude proxy)         |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST URL (realtime session store)  |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token                         |

`lib/kv.ts` reads these exact names (it also accepts Vercel KV's
`KV_REST_API_URL` / `KV_REST_API_TOKEN`).

## Deploy commands

```bash
export VERCEL_TOKEN=<vercel-token>

# 1. Link (creates the project "prompt-lab" on first run)
npx vercel@latest link --yes --project prompt-lab --token "$VERCEL_TOKEN"

# 2. Set encrypted production env vars (repeat for preview/development if wanted)
printf '%s' "$ANTHROPIC_API_KEY"        | npx vercel@latest env add ANTHROPIC_API_KEY production --token "$VERCEL_TOKEN"
printf '%s' "$UPSTASH_REDIS_REST_URL"   | npx vercel@latest env add UPSTASH_REDIS_REST_URL production --token "$VERCEL_TOKEN"
printf '%s' "$UPSTASH_REDIS_REST_TOKEN" | npx vercel@latest env add UPSTASH_REDIS_REST_TOKEN production --token "$VERCEL_TOKEN"

# 3. Deploy to production
npx vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN"
```

## Post-deploy verification

- Open `https://<project>.vercel.app/facilitate` and `/join/4271` in two browsers;
  advance a scenario on the facilitator and confirm the phone follows (proves
  Upstash sync across serverless instances).
- Spotlight a submission → **Run with Claude** → real streamed output (proves
  `ANTHROPIC_API_KEY` + the proxy).
- The header QR encodes `https://<project>.vercel.app/join/4271`.

## Security

Rotate any secret pasted into a chat afterward (Anthropic key, Upstash token,
Vercel token). Nothing secret is stored in this repo.
