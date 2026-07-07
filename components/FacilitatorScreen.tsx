"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedBackground from "./AnimatedBackground";
import QRCode from "./QRCode";
import { checkChipStyle, checksFor } from "@/lib/checks";
import {
  COLORS,
  CODE_DIGITS,
  EX1_SCEN,
  EX2_SCEN,
  LEGEND,
  SESSION_CODE,
  VERDICTS,
  type FrameworkKey,
  type Tier,
} from "@/lib/scenarios";
import type { Phase, SessionSnapshot } from "@/lib/session";
import { joinUrl, streamClaude, useSnapshot } from "@/lib/useSession";

const GLASS = "rgba(18,41,68,0.62)";
const INSET = "rgba(8,24,42,0.72)";
const PANEL_SHADOW = "0 10px 34px rgba(2,8,18,0.35)";
const blur = { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;

function pillStyle(active: boolean) {
  return {
    bg: active ? "linear-gradient(135deg, #1E49E2, #0090E0)" : "transparent",
    color: active ? "#fff" : "#93A9C6",
    border: active ? "#1E49E2" : "rgba(140,170,210,0.3)",
  };
}

export default function FacilitatorScreen() {
  const code = SESSION_CODE;
  const { snapshot, refresh, setSnapshot } = useSnapshot(code, null, 1500);

  // Local UI state (facilitator-only)
  const [menuOpen, setMenuOpen] = useState<Phase | null>(null);
  const [spotIdx, setSpotIdx] = useState<number | null>(null);
  const [spotOut, setSpotOut] = useState("");
  const [spotStreaming, setSpotStreaming] = useState(false);
  const [spotHasRun, setSpotHasRun] = useState(false);
  const [tipKey, setTipKey] = useState<FrameworkKey | null>(null);
  const [url, setUrl] = useState("https://prompt-lab.vercel.app/join/" + code);

  useEffect(() => setUrl(joinUrl(code)), [code]);

  const phase: Phase = snapshot?.phase ?? "lobby";
  const ex1Idx = snapshot?.ex1Idx ?? 0;
  const ex2Idx = snapshot?.ex2Idx ?? 0;
  const revealed = snapshot?.revealed ?? false;
  const participants = snapshot?.participants ?? 0;
  const submissions = useMemo(() => snapshot?.submissions ?? [], [snapshot]);
  const ratings = snapshot?.ratings ?? [
    { not: 0, ok: 0, fa: 0 },
    { not: 0, ok: 0, fa: 0 },
    { not: 0, ok: 0, fa: 0 },
  ];

  const scen1 = EX1_SCEN[ex1Idx];
  const scen2 = EX2_SCEN[ex2Idx];

  // Reset spotlight when the write-scenario changes.
  const prevEx1 = useRef(ex1Idx);
  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevEx1.current !== ex1Idx || prevPhase.current !== phase) {
      setSpotIdx(null);
      setSpotOut("");
      setSpotHasRun(false);
      setSpotStreaming(false);
      setTipKey(null);
      prevEx1.current = ex1Idx;
      prevPhase.current = phase;
    }
  }, [ex1Idx, phase]);

  // Keep spotIdx valid as the feed grows/shrinks.
  useEffect(() => {
    if (spotIdx != null && spotIdx >= submissions.length) {
      setSpotIdx(null);
      setSpotHasRun(false);
      setSpotOut("");
    }
  }, [submissions.length, spotIdx]);

  const control = useCallback(
    async (action: string, extra?: { phase?: Phase; idx?: number }) => {
      setMenuOpen(null);
      try {
        const res = await fetch(`/api/session/${code}/state`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        });
        if (res.ok) setSnapshot((await res.json()) as SessionSnapshot);
      } catch {
        void refresh();
      }
    },
    [code, refresh, setSnapshot],
  );

  const spot = spotIdx != null ? submissions[spotIdx] : null;

  const runSpot = useCallback(async () => {
    if (!spot || spotStreaming) return;
    setSpotHasRun(true);
    setSpotStreaming(true);
    setSpotOut("");
    await streamClaude(
      { prompt: spot.text, artifact: scen1.material, role: "facilitator", code },
      (full) => setSpotOut(full),
    );
    setSpotStreaming(false);
  }, [spot, spotStreaming, scen1.material, code]);

  // ── Contextual primary control ──
  let primaryLabel = "";
  let primaryAction: () => void = () => {};
  let statusLine = "";
  if (phase === "lobby") {
    primaryLabel = "Start Exercise 2.1 →";
    primaryAction = () => control("goto", { phase: "ex1", idx: 0 });
    statusLine = "Waiting for the room to join";
  } else if (phase === "ex1") {
    if (ex1Idx < 2) {
      const n = EX1_SCEN[ex1Idx + 1];
      primaryLabel = `Next: ${n.num} ${n.name} →`;
      primaryAction = () => control("goto", { phase: "ex1", idx: ex1Idx + 1 });
    } else {
      primaryLabel = "Start Exercise 3.1 →";
      primaryAction = () => control("goto", { phase: "ex2", idx: 0 });
    }
    statusLine = `${submissions.length} prompt${submissions.length === 1 ? "" : "s"} submitted`;
  } else if (!revealed) {
    primaryLabel = "Reveal & debrief";
    primaryAction = () => control("reveal");
    const total = ratings.reduce((a, r) => a + r.not + r.ok + r.fa, 0);
    statusLine = `${total} rating${total === 1 ? "" : "s"} received`;
  } else {
    if (ex2Idx < 2) {
      const n = EX2_SCEN[ex2Idx + 1];
      primaryLabel = `Next: ${n.num} ${n.name} →`;
      primaryAction = () => control("goto", { phase: "ex2", idx: ex2Idx + 1 });
    } else {
      primaryLabel = "Back to lobby";
      primaryAction = () => control("goto", { phase: "lobby" });
    }
    statusLine = "Debrief — tap the highlights to explain each component";
  }

  const lobbyP = pillStyle(phase === "lobby");
  const ex1P = pillStyle(phase === "ex1");
  const ex2P = pillStyle(phase === "ex2");
  const tipText = tipKey ? LEGEND.find((l) => l.k === tipKey)?.tip ?? null : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#E8F0FA",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        isolation: "isolate",
      }}
    >
      <AnimatedBackground />

      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 28px",
          borderBottom: "1px solid rgba(0,184,245,0.22)",
          background: "rgba(8,21,39,0.55)",
          ...blur,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, #1E49E2, #0090E0)",
            boxShadow: "0 2px 12px rgba(0,144,224,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            fontSize: 16,
            color: "#fff",
          }}
        >
          PL
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.2px" }}>Prompt Lab</div>
          <div style={{ fontSize: 12, color: "#93A9C6" }}>
            Prompting for Leadership · Demystifying AI seminar
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 14px 5px 6px",
              borderRadius: 12,
              border: "1px solid rgba(0,184,245,0.35)",
              background: "rgba(0,184,245,0.06)",
            }}
          >
            <QRCode url={url} size={48} radius={8} quiet={4} />
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "#ACEAFF",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#33E0A0",
                    animation: "pulseDot 2s infinite",
                  }}
                />
                Session {SESSION_CODE} · <span data-testid="participant-count">{participants}</span> joined
              </div>
              <div style={{ fontSize: 11, color: "#93A9C6" }}>
                Scan any time to join — your phone lands on the live exercise
              </div>
            </div>
          </div>
          <div
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              background: "rgba(255,181,71,0.12)",
              border: "1px solid rgba(255,181,71,0.35)",
              fontSize: 12,
              color: "#FFB547",
              fontWeight: 600,
            }}
          >
            Synthetic scenarios only — no client or personal data
          </div>
        </div>
      </header>

      <main style={{ display: "flex", gap: 28, padding: "20px 28px 40px", alignItems: "flex-start" }}>
        {/* ══════════ Facilitator screen ══════════ */}
        <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1.2px",
                color: "#93A9C6",
                textTransform: "uppercase",
                marginRight: 8,
              }}
            >
              Facilitator · projected screen
            </div>

            <StepperPill
              label="1 · Lobby"
              style={lobbyP}
              onClick={() => control("goto", { phase: "lobby" })}
            />

            <DropdownPill
              label={`2 · Write the prompt${phase === "ex1" ? " · " + scen1.num : ""} ▾`}
              style={ex1P}
              open={menuOpen === "ex1"}
              onToggle={() => setMenuOpen((m) => (m === "ex1" ? null : "ex1"))}
              accent="#00B8F5"
              hoverBg="rgba(0,184,245,0.12)"
              items={EX1_SCEN.map((sc, i) => ({
                num: sc.num,
                name: sc.name,
                active: phase === "ex1" && ex1Idx === i,
                activeColor: "#ACEAFF",
                activeBg: "rgba(0,184,245,0.12)",
                onClick: () => control("goto", { phase: "ex1", idx: i }),
              }))}
            />

            <DropdownPill
              label={`3 · Rate the prompts${phase === "ex2" ? " · " + scen2.num : ""} ▾`}
              style={ex2P}
              open={menuOpen === "ex2"}
              onToggle={() => setMenuOpen((m) => (m === "ex2" ? null : "ex2"))}
              accent="#9F7BFF"
              hoverBg="rgba(159,123,255,0.15)"
              items={EX2_SCEN.map((sc, i) => ({
                num: sc.num,
                name: sc.name,
                active: phase === "ex2" && ex2Idx === i,
                activeColor: "#C9B4FF",
                activeBg: "rgba(159,123,255,0.15)",
                onClick: () => control("goto", { phase: "ex2", idx: i }),
              }))}
            />

            <div style={{ flex: 1 }} />
            <button
              onClick={() => control("reset")}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(140,170,210,0.3)",
                background: "transparent",
                color: "#93A9C6",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset session
            </button>
          </div>

          {/* ── LOBBY ── */}
          {phase === "lobby" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 14 }}>
              <div
                style={{
                  background: GLASS,
                  ...blur,
                  border: "1px solid rgba(140,170,210,0.22)",
                  boxShadow: PANEL_SHADOW,
                  borderRadius: 16,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 18,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "1px", color: "#00B8F5", textTransform: "uppercase" }}>
                  Join on your phone
                </div>
                <QRCode url={url} size={148} radius={14} quiet={8} />
                <div style={{ display: "flex", gap: 8 }}>
                  {CODE_DIGITS.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        width: 44,
                        height: 52,
                        borderRadius: 10,
                        background: "rgba(8,24,42,0.72)",
                        border: "1px solid rgba(0,184,245,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontFamily: "var(--font-space-grotesk)",
                        fontWeight: 700,
                        letterSpacing: "-0.01em",
                        color: "#ACEAFF",
                      }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: "#93A9C6" }}>
                  Scan the QR or enter the code. No login, nothing stored after the session.
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <PreviewCard
                  label="EXERCISE 1"
                  labelColor="#00B8F5"
                  title="Write the prompt"
                  body="Three realistic tasks — a client escalation, a requirements document, a piece of legacy code. Write the prompt you'd give an AI assistant, on your phone. We'll put a few on screen and run them against Claude, live."
                />
                <PreviewCard
                  label="EXERCISE 2"
                  labelColor="#9F7BFF"
                  title="Rate the prompts"
                  body="Same tasks, three prompts each. Rate every prompt — not so good, okay, or fantastic — then we reveal what separates them."
                />
                <div
                  style={{
                    background: "rgba(51,224,160,0.07)",
                    border: "1px solid rgba(51,224,160,0.25)",
                    borderRadius: 16,
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <span style={{ fontSize: 26, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", color: "#33E0A0" }}>
                    {participants}
                  </span>
                  <span style={{ fontSize: 14, color: "#C9D8EC" }}>participants in the room and counting…</span>
                </div>
              </div>
            </div>
          )}

          {/* ── EXERCISE 1 ── */}
          {phase === "ex1" && (
            <>
              <div
                style={{
                  background: GLASS,
                  ...blur,
                  border: "1px solid rgba(140,170,210,0.22)",
                  boxShadow: PANEL_SHADOW,
                  borderRadius: 14,
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", color: "#00B8F5", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {scen1.num} · The ask
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, color: "#C9D8EC" }}>{scen1.ask}</div>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#93A9C6", background: INSET, borderRadius: 10, padding: "12px 14px", whiteSpace: "pre-wrap" }}>
                  {scen1.material}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, alignItems: "start" }}>
                {/* submissions feed */}
                <div style={{ background: INSET, border: "1px solid rgba(140,170,210,0.12)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#93A9C6", textTransform: "uppercase" }}>
                      Submissions
                    </div>
                    <div style={{ fontSize: 13, color: "#33E0A0", fontWeight: 700 }}>{submissions.length} received</div>
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 11, color: "#93A9C6" }}>tap one to spotlight</div>
                  </div>
                  {submissions.map((sb, i) => {
                    const selected = spotIdx === i;
                    return (
                      <button
                        key={sb.id}
                        data-testid="submission"
                        onClick={() => {
                          setSpotIdx(i);
                          setSpotOut("");
                          setSpotHasRun(false);
                          setSpotStreaming(false);
                        }}
                        style={{
                          textAlign: "left",
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: `1px solid ${selected ? "#00B8F5" : "rgba(140,170,210,0.18)"}`,
                          background: selected ? "rgba(0,184,245,0.08)" : GLASS,
                          color: "#E8F0FA",
                          fontFamily: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          animation: "slideIn 0.35s ease",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#00B8F5" }}>{sb.name}</span>
                        <span style={{ fontSize: 13, lineHeight: 1.5, color: "#C9D8EC" }}>{sb.text}</span>
                      </button>
                    );
                  })}
                  {submissions.length === 0 && (
                    <div style={{ border: "1px dashed rgba(140,170,210,0.3)", borderRadius: 12, padding: 24, textAlign: "center", fontSize: 13, color: "#93A9C6" }}>
                      Waiting for prompts from the room…
                    </div>
                  )}
                </div>
                {/* spotlight */}
                <div style={{ background: GLASS, ...blur, border: "1px solid rgba(0,184,245,0.35)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12, minHeight: 260 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#00B8F5", textTransform: "uppercase" }}>
                    Spotlight
                  </div>
                  {spot ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#ACEAFF" }}>{spot.name}</span>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {checksFor(spot.text).map((ck) => {
                            const s = checkChipStyle(ck.ok);
                            return (
                              <span key={ck.name} style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                                {s.mark} {ck.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.6, color: "#E8F0FA", background: INSET, borderRadius: 12, padding: 14 }}>{spot.text}</div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          data-testid="run-claude"
                          onClick={runSpot}
                          style={{
                            padding: "10px 20px",
                            borderRadius: 10,
                            border: "none",
                            background: "linear-gradient(135deg, #1E49E2 0%, #0090E0 100%)",
                            color: "#fff",
                            boxShadow: "0 4px 18px rgba(0,144,224,0.35)",
                            fontFamily: "inherit",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: spotStreaming ? "default" : "pointer",
                            opacity: spotStreaming ? 0.55 : 1,
                          }}
                        >
                          {spotStreaming && !spotOut ? "Calling Claude…" : "Run with Claude ▸"}
                        </button>
                        <span style={{ fontSize: 12, color: "#93A9C6" }}>claude-sonnet · live call</span>
                      </div>
                      {spotHasRun && (
                        <div data-testid="spotlight-output" className="pl-scroll" style={{ background: INSET, border: "1px solid rgba(140,170,210,0.12)", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.65, color: "#DCE7F5", whiteSpace: "pre-wrap", maxHeight: 320, overflow: "auto" }}>
                          {spotOut || (spotStreaming ? "Thinking…" : "")}
                          {spotStreaming && (
                            <span data-testid="stream-caret" style={{ display: "inline-block", width: 8, height: 15, background: "#00B8F5", marginLeft: 2, verticalAlign: "text-bottom", animation: "blinkCaret 0.9s infinite" }} />
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ flex: 1, border: "1px dashed rgba(140,170,210,0.3)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#93A9C6", padding: 24, textAlign: "center" }}>
                      Pick a submission to put it on screen and run it against Claude.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── EXERCISE 2 ── */}
          {phase === "ex2" && (
            <>
              <div style={{ background: GLASS, ...blur, border: "1px solid rgba(140,170,210,0.22)", boxShadow: PANEL_SHADOW, borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 20, alignItems: "baseline" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", color: "#9F7BFF", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {scen2.num} · The artefact
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.55, color: "#C9D8EC" }}>{scen2.ask}</div>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#93A9C6", background: INSET, borderRadius: 10, padding: "12px 14px", whiteSpace: "pre-wrap" }}>
                  {scen2.artifact}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "start" }}>
                {scen2.prompts.map((p, i) => {
                  const r = ratings[i] ?? { not: 0, ok: 0, fa: 0 };
                  const max = Math.max(1, r.not, r.ok, r.fa);
                  const v = revealed ? VERDICTS[p.tier] : null;
                  const bars: [string, string, number][] = [
                    ["Not so good", "#FF7A90", r.not],
                    ["Okay", "#FFB547", r.ok],
                    ["Fantastic", "#33E0A0", r.fa],
                  ];
                  return (
                    <div
                      key={p.label}
                      style={{
                        background: GLASS,
                        ...blur,
                        border: `1px solid ${revealed && p.tier === "fant" ? "rgba(51,224,160,0.5)" : "rgba(140,170,210,0.16)"}`,
                        borderRadius: 16,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "0.8px", background: "rgba(159,123,255,0.15)", color: "#C9B4FF" }}>
                          {p.label}
                        </span>
                        {v && (
                          <span data-testid={`verdict-${p.tier}`} style={{ padding: "3px 12px", borderRadius: 999, fontSize: 11, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", background: v[1], color: v[2] }}>
                            {v[0]}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#C9D8EC", minHeight: 120 }}>{p.text}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(140,170,210,0.14)", paddingTop: 10 }}>
                        {bars.map(([name, color, n]) => (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "#93A9C6", width: 74, fontWeight: 600 }}>{name}</span>
                            <div style={{ flex: 1, height: 7, borderRadius: 999, background: "rgba(140,170,210,0.15)", overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 999, background: color, width: Math.round((n / max) * 100) + "%", transition: "width 0.4s ease" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#E8F0FA", width: 20, textAlign: "right" }}>{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              {revealed && (
                <div style={{ background: GLASS, ...blur, border: "1px solid rgba(51,224,160,0.35)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, animation: "slideIn 0.4s ease" }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#33E0A0", textTransform: "uppercase" }}>
                    Anatomy of the fantastic prompt
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.8, color: "#C9D8EC" }}>
                    {scen2.segs.map((seg, i) => (
                      <span
                        key={i}
                        data-testid={`anatomy-seg-${seg.k}`}
                        title={LEGEND.find((l) => l.k === seg.k)?.tip}
                        onClick={() => setTipKey(seg.k)}
                        style={{ background: COLORS[seg.k] + "2E", boxShadow: `inset 0 -2px 0 ${COLORS[seg.k]}`, borderRadius: 3, padding: "1px 3px", cursor: "pointer" }}
                      >
                        {seg.t}{" "}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 6, borderTop: "1px solid rgba(140,170,210,0.14)" }}>
                    {LEGEND.map((lg) => (
                      <button
                        key={lg.k}
                        onClick={() => setTipKey(lg.k)}
                        title={lg.tip}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(140,170,210,0.25)", background: "transparent", color: "#E8F0FA", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS[lg.k] }} />
                        {lg.name}
                      </button>
                    ))}
                  </div>
                  {tipText && (
                    <div data-testid="tip-text" style={{ fontSize: 12.5, color: "#ACEAFF", background: "rgba(0,184,245,0.08)", borderRadius: 8, padding: "8px 12px" }}>{tipText}</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* controls */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: GLASS, ...blur, border: "1px solid rgba(140,170,210,0.22)", boxShadow: PANEL_SHADOW, borderRadius: 14, padding: "12px 16px" }}>
            <button
              data-testid="primary-control"
              onClick={primaryAction}
              style={{ padding: "11px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1E49E2 0%, #0090E0 100%)", color: "#fff", boxShadow: "0 4px 18px rgba(0,144,224,0.35)", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {primaryLabel}
            </button>
            <div style={{ flex: 1 }} />
            <div data-testid="status-line" style={{ fontSize: 13, color: "#93A9C6" }}>{statusLine}</div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Small presentational helpers ──

function StepperPill({
  label,
  style,
  onClick,
}: {
  label: string;
  style: { bg: string; color: string; border: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ padding: "8px 16px", borderRadius: 999, border: `1px solid ${style.border}`, background: style.bg, color: style.color, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}

interface DropdownItem {
  num: string;
  name: string;
  active: boolean;
  activeColor: string;
  activeBg: string;
  onClick: () => void;
}

function DropdownPill({
  label,
  style,
  open,
  onToggle,
  items,
  accent,
  hoverBg,
}: {
  label: string;
  style: { bg: string; color: string; border: string };
  open: boolean;
  onToggle: () => void;
  items: DropdownItem[];
  accent: string;
  hoverBg: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
        style={{ padding: "8px 16px", borderRadius: 999, border: `1px solid ${style.border}`, background: style.bg, color: style.color, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        {label}
      </button>
      {open && (
        <div style={{ position: "absolute", top: 42, left: 0, zIndex: 40, background: "rgba(18,41,68,0.62)", ...blur, border: "1px solid rgba(140,170,210,0.3)", borderRadius: 12, padding: 6, display: "flex", flexDirection: "column", gap: 2, minWidth: 260, boxShadow: "0 12px 32px rgba(0,0,0,0.45)", animation: "slideIn 0.15s ease" }}>
          {items.map((it) => (
            <button
              key={it.num}
              data-testid={`menu-item-${it.num}`}
              onClick={it.onClick}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: it.active ? it.activeBg : "transparent", color: it.active ? it.activeColor : "#C9D8EC", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", gap: 10, alignItems: "baseline" }}
              onMouseEnter={(e) => { if (!it.active) e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={(e) => { if (!it.active) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", color: accent }}>{it.num}</span>
              {it.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewCard({
  label,
  labelColor,
  title,
  body,
}: {
  label: string;
  labelColor: string;
  title: string;
  body: string;
}) {
  return (
    <div style={{ background: GLASS, ...blur, border: "1px solid rgba(140,170,210,0.22)", boxShadow: PANEL_SHADOW, borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: labelColor }}>{label}</div>
      <div style={{ fontSize: 19, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#C9D8EC", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

// (Tier import retained for parity with the design's type surface.)
export type { Tier };
