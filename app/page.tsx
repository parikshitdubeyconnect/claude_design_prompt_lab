import Link from "next/link";
import AnimatedBackground from "@/components/AnimatedBackground";
import { SESSION_CODE } from "@/lib/scenarios";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        position: "relative",
        isolation: "isolate",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "48px 24px",
        color: "#E8F0FA",
        textAlign: "center",
      }}
    >
      <AnimatedBackground />

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1E49E2, #0090E0)",
            boxShadow: "0 2px 12px rgba(0,144,224,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-space-grotesk)",
            fontWeight: 700,
            fontSize: 22,
            color: "#fff",
          }}
        >
          PL
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Prompt Lab</div>
          <div style={{ fontSize: 13, color: "#93A9C6" }}>Prompting for Leadership · Demystifying AI seminar</div>
        </div>
      </div>

      <p style={{ maxWidth: 520, fontSize: 15, lineHeight: 1.7, color: "#C9D8EC", margin: 0 }}>
        A facilitator-led, hands-on session on the difference between bad, okay and
        fantastic prompts — on realistic (synthetic) banking tasks. Open the projected
        screen to run the room, or join from a phone.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/facilitate"
          style={{
            padding: "13px 26px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #1E49E2 0%, #0090E0 100%)",
            boxShadow: "0 4px 18px rgba(0,144,224,0.35)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Open facilitator screen →
        </Link>
        <Link
          href={`/join/${SESSION_CODE}`}
          style={{
            padding: "13px 26px",
            borderRadius: 12,
            border: "1px solid rgba(0,184,245,0.5)",
            color: "#ACEAFF",
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Join as participant
        </Link>
      </div>

      <div style={{ fontSize: 12, color: "#93A9C6" }}>
        Session code <span style={{ color: "#ACEAFF", fontWeight: 700, letterSpacing: 1 }}>{SESSION_CODE}</span>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 16,
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
    </main>
  );
}
