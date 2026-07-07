"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSnapshot } from "./session";

// Stable per-device participant id (survives reloads). Not personal data.
export function usePid(): string {
  const [pid, setPid] = useState("");
  useEffect(() => {
    const KEY = "pl.pid";
    let v = "";
    try {
      v = localStorage.getItem(KEY) || "";
      if (!v) {
        v =
          "p_" +
          (crypto?.randomUUID?.() ??
            Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
        localStorage.setItem(KEY, v);
      }
    } catch {
      v = "p_" + Math.random().toString(36).slice(2, 10);
    }
    setPid(v);
  }, []);
  return pid;
}

// Poll the shared session snapshot on an interval.
export function useSnapshot(
  code: string,
  pid: string | null,
  intervalMs = 1500,
): { snapshot: SessionSnapshot | null; refresh: () => Promise<void>; setSnapshot: (s: SessionSnapshot) => void } {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const pidRef = useRef(pid);
  pidRef.current = pid;

  const refresh = useCallback(async () => {
    try {
      const q = pidRef.current ? `?pid=${encodeURIComponent(pidRef.current)}` : "";
      const res = await fetch(`/api/session/${code}/state${q}`, { cache: "no-store" });
      if (res.ok) setSnapshot((await res.json()) as SessionSnapshot);
    } catch {
      /* transient network error on flaky venue Wi-Fi — keep last snapshot */
    }
  }, [code]);

  useEffect(() => {
    let alive = true;
    void refresh();
    const id = setInterval(() => {
      if (alive) void refresh();
    }, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [refresh, intervalMs]);

  return { snapshot, refresh, setSnapshot };
}

// The URL a phone should open to join — encoded in the QR.
export function joinUrl(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/join/${code}`;
  }
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://prompt-lab.vercel.app";
  return `${base}/join/${code}`;
}

// Stream a Claude response, invoking onChunk with the growing text.
export async function streamClaude(
  payload: Record<string, unknown>,
  onChunk: (full: string) => void,
): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.body) {
    const txt = await res.text();
    onChunk(txt);
    return txt;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onChunk(full);
  }
  return full;
}
