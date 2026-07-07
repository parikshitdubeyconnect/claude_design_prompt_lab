// Instant prompt-quality heuristic — ported from the design source `checksFor()`.
// Does the prompt give the AI a role, context, a format and constraints?

export interface PromptCheck {
  name: "Role" | "Context" | "Format" | "Constraints";
  ok: boolean;
}

export function checksFor(text: string): PromptCheck[] {
  const t = (text || "").toLowerCase();
  const has: Record<PromptCheck["name"], boolean> = {
    Role: /you are|act as|as a |you're a/.test(t),
    Context:
      t.length > 120 &&
      /(client|cfo|committee|audience|year|context|standard|legacy|author|review)/.test(t),
    Format: /(bullet|structure|format|list|section|numbered|\d\))/.test(t),
    Constraints:
      /(under \d|words|tone|avoid|jargon|neutral|warm|concise|do not|don't|pages)/.test(t),
  };
  return (Object.keys(has) as PromptCheck["name"][]).map((name) => ({
    name,
    ok: has[name],
  }));
}

// Chip styling for a check (used by both facilitator spotlight and phone write screen)
export function checkChipStyle(ok: boolean) {
  return {
    mark: ok ? "✓" : "·",
    bg: ok ? "rgba(51,224,160,0.12)" : "rgba(140,170,210,0.08)",
    color: ok ? "#7FF0C4" : "#93A9C6",
    border: ok ? "rgba(51,224,160,0.4)" : "rgba(140,170,210,0.2)",
  };
}
