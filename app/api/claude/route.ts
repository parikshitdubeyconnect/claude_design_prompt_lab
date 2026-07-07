import { NextRequest } from "next/server";
import {
  CLAUDE_MODEL,
  MAX_TOKENS,
  MAX_RUNS_PER_SCENARIO,
  SYS,
} from "@/lib/scenarios";
import { incRun, isValidCode, runsUsed } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PROMPT_LEN = 4000;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface ClaudeRequest {
  prompt?: string;
  artifact?: string;
  role?: "facilitator" | "participant";
  code?: string;
  pid?: string;
  ex1Idx?: number;
}

function textStream(text: string): ReadableStream<Uint8Array> {
  // Fallback streamer (also used for graceful degradation without a key):
  // emits the text in small chunks so the client sees it type in.
  const enc = new TextEncoder();
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 6) chunks.push(text.slice(i, i + 6));
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(enc.encode(chunks[i++]));
    },
  });
}

const streamHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ClaudeRequest;
  const prompt = (body.prompt || "").trim();
  const artifact = (body.artifact || "").trim();
  const role = body.role === "facilitator" ? "facilitator" : "participant";

  if (!prompt) {
    return new Response("[No prompt provided]", { status: 400, headers: streamHeaders });
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return new Response("[Prompt exceeds the length limit for this workshop.]", {
      status: 413,
      headers: streamHeaders,
    });
  }

  // Rate-limit participant "try it yourself" runs (3 per scenario). The
  // facilitator's spotlight runs are unlimited.
  if (role === "participant") {
    const { code, pid, ex1Idx } = body;
    if (!code || !isValidCode(code) || !pid || typeof ex1Idx !== "number") {
      return new Response("[Missing session context]", { status: 400, headers: streamHeaders });
    }
    const used = await runsUsed(code, ex1Idx, pid);
    if (used >= MAX_RUNS_PER_SCENARIO) {
      return new Response("[You've used all your runs for this scenario.]", {
        status: 429,
        headers: streamHeaders,
      });
    }
    await incRun(code, ex1Idx, pid);
  }

  const userContent =
    prompt + "\n\n---\nREFERENCE MATERIAL (synthetic):\n" + artifact;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful degradation so the app runs before a key is provisioned.
    const notice =
      "[Demo mode — no ANTHROPIC_API_KEY set on the server, so this is a placeholder.]\n\n" +
      "In the live app, your prompt is sent to Claude (" +
      CLAUDE_MODEL +
      ") with a banking-appropriate system prompt and the synthetic reference material, and the real answer streams in here. A weak prompt gets a generic answer; a precise prompt gets a precise one — which is exactly the point of this exercise.";
    return new Response(textStream(notice), { headers: streamHeaders });
  }

  // ── Real streaming call to the Anthropic Messages API ──
  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYS,
        stream: true,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(textStream("[Could not reach Claude: " + msg + "]"), {
      headers: streamHeaders,
    });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(
      textStream(`[Claude API error ${upstream.status}] ${detail.slice(0, 300)}`),
      { headers: streamHeaders },
    );
  }

  // Parse Anthropic SSE and re-emit only the text deltas as a plain text stream.
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();

  const out = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let buffer = "";
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          buffer += dec.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            for (const line of evt.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                if (
                  json.type === "content_block_delta" &&
                  json.delta?.type === "text_delta" &&
                  typeof json.delta.text === "string"
                ) {
                  controller.enqueue(enc.encode(json.delta.text));
                } else if (json.type === "error") {
                  controller.enqueue(
                    enc.encode("\n[Claude error: " + (json.error?.message || "unknown") + "]"),
                  );
                }
              } catch {
                /* ignore non-JSON keepalives */
              }
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(enc.encode("\n[Stream interrupted: " + msg + "]"));
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(out, { headers: streamHeaders });
}
