"use client";

import { useEffect, useMemo, useRef } from "react";

// Fixed, behind-everything animated background: sliding dot grid, three drifting
// glow orbs, two light-beam sweeps, a field of rising/falling twinkling flakes,
// and a Ferrari-style car easter egg that drives right→left every 15s.
// Ported from the Prompt Lab design source.

interface Flake {
  left: string;
  size: string;
  color: string;
  glow: string;
  dur: string;
  delay: string;
  dir: string;
  sway: string;
  tw: string;
}

function buildFlakes(): Flake[] {
  const colors = [
    "rgba(172,234,255,0.7)",
    "rgba(0,184,245,0.6)",
    "rgba(159,123,255,0.5)",
    "rgba(255,255,255,0.45)",
  ];
  let seed = 13;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 28 }, () => {
    const size = 2 + Math.round(rnd() * 3);
    return {
      left: Math.round(rnd() * 100) + "%",
      size: size + "px",
      color: colors[Math.floor(rnd() * colors.length)],
      glow: 4 + size * 2 + "px",
      dur: Math.round(16 + rnd() * 18) + "s",
      delay: "-" + Math.round(rnd() * 30) + "s",
      dir: rnd() < 0.45 ? "reverse" : "normal",
      sway: (3 + rnd() * 5).toFixed(1) + "s",
      tw: (2 + rnd() * 3).toFixed(1) + "s",
    };
  });
}

function Car() {
  const carRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = carRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      if (raf) cancelAnimationFrame(raf);
      const W = window.innerWidth;
      let x = W + 120;
      let reversing = false;
      let reverseEnd = 0;
      let nextReverseAt = W * (0.35 + Math.random() * 0.35);
      let last = performance.now();
      const speed = 170;
      const step = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reversing && x < nextReverseAt && x > 160) {
          reversing = true;
          reverseEnd = now + 500 + Math.random() * 800;
          nextReverseAt = x - (250 + Math.random() * 400);
        }
        if (reversing && now > reverseEnd) reversing = false;
        x += (reversing ? speed * 0.6 : -speed) * dt;
        el.style.transform = "translateX(" + x + "px)";
        el.querySelectorAll<HTMLElement>(".pl-wheel-hub").forEach((h) => {
          h.style.animationDirection = reversing ? "reverse" : "normal";
        });
        if (x > -160) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    timeoutId = setTimeout(run, 1500);
    intervalId = setInterval(run, 15000);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const wheel = (
    <div
      className="pl-wheel-hub"
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#C9A227",
        position: "relative",
        animation: "wheelSpin 0.4s linear infinite",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 3, width: 1.5, height: 7, background: "#05080F" }} />
      <div style={{ position: "absolute", top: 3, left: 0, width: 7, height: 1.5, background: "#05080F" }} />
    </div>
  );

  return (
    <div
      ref={carRef}
      style={{
        position: "fixed",
        bottom: 4,
        left: 0,
        zIndex: 30,
        pointerEvents: "none",
        willChange: "transform",
        transform: "translateX(-300px)",
        width: 92,
        height: 28,
      }}
    >
      <div style={{ position: "absolute", bottom: 6, left: 0, width: 92, height: 12, borderRadius: "10px 5px 2px 3px", background: "linear-gradient(180deg, #FF2800 0%, #D40F1E 55%, #8E0A14 100%)", boxShadow: "0 0 16px rgba(255,40,0,0.5)" }} />
      <div style={{ position: "absolute", bottom: 15, left: 4, width: 26, height: 5, borderRadius: "6px 0 0 2px", background: "linear-gradient(180deg, #FF3B14, #C40D1B)", transform: "skewX(-24deg)" }} />
      <div style={{ position: "absolute", bottom: 15, left: 30, width: 34, height: 9, borderRadius: "8px 7px 0 0", background: "linear-gradient(180deg, #16273E, #060B14)", border: "1px solid rgba(255,140,120,0.45)", borderBottom: "none", transform: "skewX(-12deg)" }} />
      <div style={{ position: "absolute", bottom: 16, left: 34, width: 11, height: 6, borderRadius: "3px 2px 0 0", background: "rgba(170,215,255,0.55)", transform: "skewX(-14deg)" }} />
      <div style={{ position: "absolute", bottom: 17, left: 74, width: 15, height: 2.5, borderRadius: 2, background: "#6E0810" }} />
      <div style={{ position: "absolute", bottom: 14, left: 84, width: 3, height: 4, background: "#8E0A14" }} />
      <div style={{ position: "absolute", bottom: 9, left: 58, width: 7, height: 4, borderRadius: 1, background: "rgba(0,0,0,0.4)", transform: "skewX(-20deg)" }} />
      <div style={{ position: "absolute", bottom: 6, left: 10, width: 72, height: 2, background: "rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", bottom: 12, left: -2, width: 6, height: 4, borderRadius: 2, background: "#FFF3C4", boxShadow: "-8px 0 14px 4px rgba(255,243,196,0.4)" }} />
      <div style={{ position: "absolute", bottom: 12, right: -1, width: 4, height: 4, borderRadius: "50%", background: "#FF3B30", boxShadow: "5px 0 10px 3px rgba(255,59,48,0.45)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 14, width: 14, height: 14, borderRadius: "50%", background: "#05080F", border: "2px solid #1C2A40", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>{wheel}</div>
      <div style={{ position: "absolute", bottom: 0, left: 62, width: 14, height: 14, borderRadius: "50%", background: "#05080F", border: "2px solid #1C2A40", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>{wheel}</div>
    </div>
  );
}

export default function AnimatedBackground({ car = true }: { car?: boolean }) {
  const flakes = useMemo(buildFlakes, []);

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          overflow: "hidden",
          pointerEvents: "none",
          background: "linear-gradient(160deg, #0D2138 0%, #123054 45%, #163A64 100%)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(150,195,245,0.16) 1px, transparent 1.5px)", backgroundSize: "28px 28px", animation: "gridSlide 60s linear infinite" }} />
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(52,105,255,0.34) 0%, transparent 65%)", filter: "blur(50px)", animation: "drift1 26s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-25%", right: "-12%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,184,245,0.22) 0%, transparent 65%)", filter: "blur(60px)", animation: "drift2 32s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "25%", right: "20%", width: "34vw", height: "34vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(159,123,255,0.18) 0%, transparent 65%)", filter: "blur(55px)", animation: "drift3 38s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "-20%", left: 0, width: 220, height: "140vh", background: "linear-gradient(90deg, transparent, rgba(172,234,255,0.05), transparent)", animation: "beamSweep 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "-20%", left: 0, width: 120, height: "140vh", background: "linear-gradient(90deg, transparent, rgba(0,184,245,0.04), transparent)", animation: "beamSweep 29s ease-in-out 9s infinite" }} />
        {flakes.map((f, i) => (
          <div key={i} style={{ position: "absolute", left: f.left, bottom: "-4%", animation: `flakeRise ${f.dur} linear ${f.delay} infinite ${f.dir}` }}>
            <div style={{ width: f.size, height: f.size, borderRadius: "50%", background: f.color, boxShadow: `0 0 ${f.glow} ${f.color}`, animation: `flakeSway ${f.sway} ease-in-out infinite alternate, twinkle ${f.tw} ease-in-out infinite` }} />
          </div>
        ))}
      </div>
      {car && <Car />}
    </>
  );
}
