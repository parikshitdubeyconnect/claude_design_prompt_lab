"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AnimatedBackground from "./AnimatedBackground";
import { checkChipStyle, checksFor } from "@/lib/checks";
import {
  CODE_DIGITS,
  EX1_SCEN,
  EX2_SCEN,
  LEGEND,
  MAX_RUNS_PER_SCENARIO,
  COLORS,
} from "@/lib/scenarios";
import { streamClaude, usePid, useSnapshot } from "@/lib/useSession";

const GLASS = "rgba(18,41,68,0.62)";
const INSET = "rgba(8,24,42,0.72)";
const blur = { backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;
type Pick = "not" | "ok" | "fa";

export default function ParticipantScreen({ code }: { code: string }) {
  const pid = usePid();
  const { snapshot, refresh } = useSnapshot(code, pid || null, 1500);

  const [joined, setJoined] = useState(false);
  const [myText, setMyText] = useState("");
  const [mySubmitted, setMySubmitted] = useState(false);
  const [myOut, setMyOut] = useState("");
  const [myBusy, setMyBusy] = useState(false);
  const [myRuns, setMyRuns] = useState(0);
  const [myRatings, setMyRatings] = useState<(Pick | null)[]>([null, null, null]);
  const [myRated, setMyRated] = useState(false);

  const phase = snapshot?.phase ?? "lobby";
  const ex1Idx = snapshot?.ex1Idx ?? 0;
  const ex2Idx = snapshot?.ex2Idx ?? 0;
  const revealed = snapshot?.revealed ?? false;
  const scen1 = EX1_SCEN[ex1Idx];
  const scen2 = EX2_SCEN[ex2Idx];

  // Restore "joined" for this session across reloads (phones follow the live exercise).
  useEffect(() => {
    try {
      if (localStorage.getItem(`pl.joined.${code}`) === "1") setJoined(true);
    } catch {
      /* ignore */
    }
  }, [code]);

  // Reset per-exercise personal state when the facilitator switches scenario.
  const prevKey = useRef("");
  useEffect(() => {
    const key = `${phase}:${ex1Idx}:${ex2Idx}`;
    if (prevKey.current && prevKey.current !== key) {
      setMyText("");
      setMySubmitted(false);
      setMyOut("");
      setMyRuns(0);
      setMyRatings(scen2.prompts.map(() => null));
      setMyRated(false);
    }
    prevKey.current = key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ex1Idx, ex2Idx]);

  const join = useCallback(() => {
    setJoined(true);
    try {
      localStorage.setItem(`pl.joined.${code}`, "1");
    } catch {
      /* ignore */
    }
    void refresh();
  }, [code, refresh]);

  const submitMine = useCallback(async () => {
    if (myText.trim().length < 10) return;
    setMySubmitted(true);
    try {
      await fetch(`/api/session/${code}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pid, text: myText.trim(), name: "You · from the room" }),
      });
    } catch {
      /* keep local optimistic state */
    }
  }, [code, pid, myText]);

  const runMine = useCallback(async () => {
    if (myBusy || myRuns >= MAX_RUNS_PER_SCENARIO) return;
    setMyBusy(true);
    setMyOut("");
    await streamClaude(
      { prompt: myText, artifact: scen1.material, role: "participant", code, pid, ex1Idx },
      (full) => setMyOut(full),
    );
    setMyBusy(false);
    setMyRuns((n) => n + 1);
  }, [myBusy, myRuns, myText, scen1.material, code, pid, ex1Idx]);

  const submitRatings = useCallback(async () => {
    if (!myRatings.every((r) => r != null)) return;
    setMyRated(true);
    try {
      await fetch(`/api/session/${code}/rate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pid, picks: myRatings }),
      });
    } catch {
      /* keep local state */
    }
  }, [code, pid, myRatings]);

  // Screen selection mirrors the design's phone state machine.
  const phoneJoin = !joined;
  const phoneLobby = joined && phase === "lobby";
  const phoneWrite = joined && phase === "ex1" && !mySubmitted;
  const phoneSubmitted = joined && phase === "ex1" && mySubmitted;
  const phoneRate = joined && phase === "ex2" && !myRated && !revealed;
  const phoneDone = joined && phase === "ex2" && (myRated || revealed);

  const topPad = "calc(env(safe-area-inset-top, 0px) + 20px)";

  return (
    <div style={{ minHeight: "100dvh", position: "relative", isolation: "isolate", display: "flex", justifyContent: "center", background: "#0A1B30" }}>
      <AnimatedBackground car={false} />
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          color: "#E8F0FA",
          position: "relative",
        }}
      >
        {/* JOIN */}
        {phoneJoin && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22, padding: `${topPad} 30px 60px` }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "linear-gradient(135deg, #1E49E2, #0090E0)", boxShadow: "0 2px 12px rgba(0,144,224,0.45)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", fontSize: 20, color: "#fff" }}>
              PL
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 26, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>Join the Prompt Lab</div>
              <div style={{ fontSize: 14, color: "#93A9C6", lineHeight: 1.5 }}>Enter the session code from the screen. No login, nothing stored.</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {CODE_DIGITS.map((d, i) => (
                <div key={i} style={{ width: 56, height: 64, borderRadius: 12, background: GLASS, ...blur, border: "1px solid rgba(0,184,245,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", color: "#ACEAFF" }}>
                  {d}
                </div>
              ))}
            </div>
            <PrimaryButton onClick={join} testid="join-btn">Join session</PrimaryButton>
            <div style={{ fontSize: 12, color: "#FFB547", lineHeight: 1.5, background: "rgba(255,181,71,0.1)", borderRadius: 10, padding: "10px 14px" }}>
              Please don&apos;t enter client, personal or confidential data. All scenarios are synthetic.
            </div>
          </div>
        )}

        {/* LOBBY */}
        {phoneLobby && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16, padding: `${topPad} 30px 60px`, textAlign: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#33E0A0", animation: "pulseDot 2s infinite" }} />
            <div style={{ fontSize: 22, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em" }}>You&apos;re in</div>
            <div style={{ fontSize: 14, color: "#93A9C6", lineHeight: 1.6 }}>Two hands-on exercises coming up. Keep an eye on the main screen — this page moves with the session.</div>
          </div>
        )}

        {/* EX1 WRITE */}
        {phoneWrite && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: `${topPad} 20px 40px` }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#00B8F5" }}>EXERCISE {scen1.num}</div>
            <div style={{ fontSize: 19, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{scen1.name}</div>
            <div style={{ fontSize: 13, color: "#C9D8EC", lineHeight: 1.55, background: GLASS, ...blur, borderRadius: 10, padding: "10px 12px" }}>{scen1.ask}</div>
            <textarea
              value={myText}
              onChange={(e) => setMyText(e.target.value)}
              data-testid="write-textarea"
              placeholder="Write the prompt you'd give an AI assistant…"
              style={{ minHeight: 150, borderRadius: 12, border: "1px solid rgba(140,170,210,0.3)", background: GLASS, ...blur, color: "#E8F0FA", fontFamily: "inherit", fontSize: 14, lineHeight: 1.5, padding: 12, resize: "vertical", outline: "none", boxSizing: "border-box", width: "100%" }}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {checksFor(myText).map((ck) => {
                const s = checkChipStyle(ck.ok);
                return (
                  <span key={ck.name} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                    {s.mark} {ck.name}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: "#93A9C6" }}>Instant check — does your prompt give the AI a role, context, a format and constraints?</div>
            <PrimaryButton onClick={submitMine} disabled={myText.trim().length < 10} testid="submit-prompt">
              Submit to the screen
            </PrimaryButton>
          </div>
        )}

        {/* EX1 SUBMITTED */}
        {phoneSubmitted && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: `${topPad} 20px 40px` }}>
            <div style={{ fontSize: 22, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", paddingTop: 12 }}>Submitted ✓</div>
            <div style={{ fontSize: 14, color: "#93A9C6", lineHeight: 1.6 }}>Your prompt is in the pool — the facilitator may put it on the big screen.</div>
            <div style={{ borderTop: "1px solid rgba(140,170,210,0.14)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 15, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em" }}>Run it yourself</div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 12, color: "#93A9C6", fontWeight: 600 }}><span data-testid="runs-left">{Math.max(0, MAX_RUNS_PER_SCENARIO - myRuns)}</span> runs left</div>
              </div>
              <button
                data-testid="run-mine"
                onClick={runMine}
                disabled={myBusy || myRuns >= MAX_RUNS_PER_SCENARIO}
                style={{ padding: 13, borderRadius: 12, border: "1px solid rgba(0,184,245,0.5)", background: "transparent", color: "#ACEAFF", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: myBusy || myRuns >= MAX_RUNS_PER_SCENARIO ? "default" : "pointer", opacity: myBusy || myRuns >= MAX_RUNS_PER_SCENARIO ? 0.5 : 1 }}
              >
                {myBusy ? "Calling Claude…" : myRuns >= MAX_RUNS_PER_SCENARIO ? "No runs left" : "Run my prompt ▸"}
              </button>
              {myOut && (
                <div className="pl-scroll" style={{ background: INSET, border: "1px solid rgba(140,170,210,0.15)", borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.6, color: "#DCE7F5", whiteSpace: "pre-wrap" }}>
                  {myOut}
                </div>
              )}
              <button onClick={() => setMySubmitted(false)} style={{ padding: 10, borderRadius: 10, border: "none", background: "transparent", color: "#00B8F5", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                ‹ Edit my prompt
              </button>
            </div>
          </div>
        )}

        {/* EX2 RATE */}
        {phoneRate && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, padding: `${topPad} 20px 40px` }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#9F7BFF" }}>EXERCISE {scen2.num}</div>
            <div style={{ fontSize: 19, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{scen2.name}</div>
            <div style={{ fontSize: 13, color: "#93A9C6", lineHeight: 1.5 }}>Same task, three prompts. How good is each?</div>
            {scen2.prompts.map((p, i) => (
              <div key={p.label} style={{ background: GLASS, ...blur, border: "1px solid rgba(140,170,210,0.2)", borderRadius: 14, padding: 13, display: "flex", flexDirection: "column", gap: 9 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#C9B4FF" }}>{p.label}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "#C9D8EC" }}>{p.text}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {([["not", "Not so good", "#FF7A90"], ["ok", "Okay", "#FFB547"], ["fa", "Fantastic", "#33E0A0"]] as [Pick, string, string][]).map(([key, name, color]) => {
                    const active = myRatings[i] === key;
                    return (
                      <button
                        key={key}
                        data-testid={`rate-${i}-${key}`}
                        onClick={() => setMyRatings((prev) => { const n = [...prev]; n[i] = key; return n; })}
                        style={{ flex: 1, padding: "8px 4px", borderRadius: 9, border: `1px solid ${active ? color : "rgba(140,170,210,0.3)"}`, background: active ? color + "26" : "transparent", color: active ? color : "#93A9C6", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <PrimaryButton onClick={submitRatings} disabled={!myRatings.every((r) => r != null)} testid="submit-ratings">
              Submit ratings
            </PrimaryButton>
          </div>
        )}

        {/* EX2 DONE / TAKEAWAY */}
        {phoneDone && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, padding: `${topPad} 22px 40px` }}>
            <div style={{ fontSize: 22, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "-0.01em", paddingTop: 8 }}>
              {revealed ? "The debrief" : "Ratings in ✓"}
            </div>
            <div style={{ fontSize: 13.5, color: "#93A9C6", lineHeight: 1.6 }}>
              {revealed
                ? "The winning prompt covers all six components. Save this for your next prompt:"
                : "Live results are on the main screen. The reveal is coming up."}
            </div>
            {revealed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--font-space-grotesk)", fontWeight: 700, letterSpacing: "1px", color: "#33E0A0", textTransform: "uppercase" }}>
                  Your takeaway — a fantastic prompt has:
                </div>
                {LEGEND.map((lg) => (
                  <div key={lg.k} style={{ display: "flex", gap: 10, alignItems: "baseline", background: GLASS, ...blur, borderRadius: 10, padding: "10px 12px" }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS[lg.k], flexShrink: 0, position: "relative", top: 1 }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{lg.name}</span>
                      <span style={{ fontSize: 12, color: "#93A9C6", lineHeight: 1.45 }}>{lg.short}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  testid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  testid?: string;
}) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 16,
        borderRadius: 12,
        border: "none",
        background: "linear-gradient(135deg, #1E49E2 0%, #0090E0 100%)",
        color: "#fff",
        boxShadow: "0 4px 18px rgba(0,144,224,0.35)",
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}
