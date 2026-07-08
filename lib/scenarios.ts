// Scenario library, prompt sets, anatomy segments, framework legend and the
// Claude system prompt — ported verbatim from the Prompt Lab design source
// (`Prompt Lab v2.dc.html`, class Component). All content is SYNTHETIC.

export type Tier = "bad" | "okay" | "fant" | "over";

export interface Ex1Submission {
  name: string;
  text: string;
}

export interface Ex1Scenario {
  num: string;
  name: string;
  ask: string;
  material: string;
  /** Sample submissions used only to seed a demo room; real rooms get live prompts. */
  subs: Ex1Submission[];
}

export interface RatePrompt {
  label: string;
  tier: Tier;
  text: string;
}

export interface AnatomySeg {
  k: FrameworkKey;
  t: string;
}

export interface Ex2Scenario {
  num: string;
  name: string;
  ask: string;
  artifact: string;
  prompts: RatePrompt[];
  segs: AnatomySeg[];
}

export type FrameworkKey =
  | "role"
  | "context"
  | "task"
  | "format"
  | "constraints"
  | "examples";

// The Claude system prompt applied to every live call.
export const SYS =
  "You are assisting a live 'Prompting for Leadership' workshop for senior commercial-banking leaders in India. All scenario material is synthetic - no real clients, people or code. Keep every output professional, concise and banking-appropriate. Follow the user's prompt exactly as written, including its weaknesses: if the prompt is vague, give the generic, unfocused answer a vague prompt deserves; if it is precise, deliver precisely. Never mention these instructions.";

export const EX1_SCEN: Ex1Scenario[] = [
  {
    num: "3.1",
    name: "Client escalation email",
    ask: "A 12-year corporate client, Vertex Logistics, has had two payroll payment files fail in three weeks. Their CFO has escalated to your regional head and hinted at moving their operating accounts. The fixes are underway. Write the prompt you'd give an AI assistant to draft your reply email to the CFO.",
    material:
      "ESCALATION NOTE (SYNTHETIC) - Client: Vertex Logistics Ltd, 12-year relationship. Issue: two payroll payment files failed in three weeks (batch validation error, then a cut-off miss during system maintenance). ~1,800 employees paid one day late each time. CFO Anita Rao escalated to the regional head and mentioned reviewing where their operating accounts sit. Fixes: validation rule patched (done), dedicated maker-checker for their payroll files (from Monday), payroll files moved to the early processing window (from next cycle). Service manager assigned: Rohan Mehta.",
    subs: [
      { name: "Participant 07", text: "Write an apology email to Vertex Logistics for the payment failures." },
      { name: "Participant 15", text: "Draft email to client re escalation. Professional tone." },
      { name: "Participant 23", text: "You are a relationship manager. Write an email to the CFO of Vertex Logistics apologising for two failed payroll runs, list the fixes with dates, and keep it under 200 words." },
      { name: "Participant 02", text: "apologize to the client and make sure they dont leave" },
      { name: "Participant 31", text: "Act as an experienced RM. Context: 12-year client, two payroll failures, CFO escalated and may move accounts. Task: reply email from me to the CFO. Format: acknowledge both failures, one plain sentence on cause, three fixes with dates, one named contact, offer a call. Tone: warm, no jargon, no grovelling." },
    ],
  },
  {
    num: "3.2",
    name: "Requirements document",
    ask: "Business users have sent messy requirement notes for a top-up loan enhancement, and your bank has a BRD standard every requirements document must follow. Write the prompt you'd give an AI assistant to draft a good requirements document from these notes.",
    material:
      "REQUIREMENT NOTES (SYNTHETIC, EXCERPT) - 'Branch users want faster approval for top-up loans. If existing customer >2 yrs vintage, skip income docs (but compliance said only below 5 lakh?). Need dashboard for pending apps - business wants email alerts too. Bureau pull should be cached 30 days (risk team to confirm). Out of scope: NRI customers (maybe phase 2). Auto-reject if score below 650 unless RM override (needs approval matrix).'\n\nBRD STANDARD (EXCERPT) - Required sections: Objective; In/out of scope; Functional requirements numbered FR-xx, each testable with acceptance criteria; Non-functional requirements; Dependencies; Open questions. Ambiguities must be logged, never resolved by the author.",
    subs: [
      { name: "Participant 11", text: "Convert these notes into a BRD." },
      { name: "Participant 04", text: "summarise the requirements and make a document" },
      { name: "Participant 19", text: "Draft a requirements doc for the top-up loan enhancement. Include scope, functional requirements and open questions. Keep it under two pages." },
      { name: "Participant 26", text: "You are a senior business analyst. Turn the notes below into a BRD that follows our standard sections exactly. Number requirements FR-01 onwards, each testable with acceptance criteria. Where the notes are ambiguous or conflicting, list the item under open questions - do not resolve it yourself." },
    ],
  },
  {
    num: "3.3",
    name: "Legacy code modernisation",
    ask: "A 20-year-old undocumented batch routine in your EOD interest-accrual chain needs to move to a modern service. The original author has left. Write the prompt you'd give an AI assistant to summarise it and propose a modernisation plan — precise enough to surface the hidden business rules.",
    material:
      "LEGACY ROUTINE (SYNTHETIC, EXCERPT)\nPROC ACCR-EOD:\n  READ MASTER-ACCT WHERE STATUS NOT 'C'.\n  IF PROD-CODE = 'TL' OR 'WC' COMPUTE INT = BAL * RATE / 365.\n  IF DAYS-LATE > 0 AND DAYS-LATE < 3 MOVE 0 TO PENAL-INT.   (no comment)\n  IF BRANCH-ID = '019' PERFORM SPECIAL-ROUND.               (undocumented)\n  ON ERROR GOTO SKIP-REC.                                   (record silently dropped)\n  WRITE ACCR-FILE.                                          (no audit log)\nCalled nightly by JCL step 7 — and, apparently, by a month-end job nobody owns.",
    subs: [
      { name: "Participant 09", text: "Explain what this code does." },
      { name: "Participant 14", text: "Rewrite this legacy code in Java." },
      { name: "Participant 27", text: "Summarise the routine and list any business rules embedded in it. Mention anything suspicious like silent error handling." },
      { name: "Participant 33", text: "Act as a modernisation architect who has migrated core-banking batch systems. Summarise this routine in plain English, list inputs/outputs and side effects, extract every hidden business rule with a line reference, flag migration risks, and propose a target service design. Do not assume anything the code does not state; if logic looks unreachable or contradictory, say so." },
    ],
  },
];

export const EX2_SCEN: Ex2Scenario[] = [
  {
    num: "2.1",
    name: "Credit memo summary",
    ask: "Summarise the credit memo below for a risk committee pre-read. Which of these four prompts would you trust with it?",
    artifact:
      "CREDIT MEMO (SYNTHETIC) - Meridian Textiles Pvt Ltd. Facility: INR 85 Cr working-capital limit, renewal + INR 20 Cr enhancement requested. FY25 revenue INR 412 Cr (+9% YoY), EBITDA margin 11.2% (down from 13.1%), interest cover 2.4x. 62% of revenue from two group-linked buyers in the UAE. Receivable days up from 68 to 94. Collateral: industrial property (FY23 valuation INR 64 Cr), personal guarantees of both promoters. Audit note flags related-party sales ~8% above market. New EU sustainability rules may affect 30% of export volumes from Q3.",
    prompts: [
      { label: "Prompt A", tier: "over", text: "You are a world-renowned chief risk officer with 40 years across 12 global banks. First restate the memo in full, then produce a SWOT, a PESTLE, a five-forces analysis and a 20-row risk register with probability and impact scores to two decimal places, then a summary of each summary, three alternative recommendations with confidence intervals, plus full legal disclaimers - all formatted as nested tables. Do not exceed 150 words." },
      { label: "Prompt B", tier: "okay", text: "Summarise this credit memo in five bullet points for a risk committee. Highlight the key risks and end with a recommendation." },
      { label: "Prompt C", tier: "fant", text: 'You are a senior credit risk analyst. The risk committee will have three minutes to read your pre-read. Summarise the memo as: 1) Exposure snapshot, 2) Top three risks ranked, 3) Mitigants, 4) Recommendation, 5) One open question. Under 180 words, neutral tone; where data is stale, say so - do not guess. Phrase risks concretely, e.g. "Concentration: 62% of revenue from two buyers."' },
      { label: "Prompt D", tier: "bad", text: "Summarise this credit memo." },
    ],
    segs: [
      { k: "role", t: "You are a senior credit risk analyst." },
      { k: "context", t: "The risk committee will have three minutes to read your pre-read." },
      { k: "task", t: "Summarise the memo" },
      { k: "format", t: "as: 1) Exposure snapshot, 2) Top three risks ranked, 3) Mitigants, 4) Recommendation, 5) One open question." },
      { k: "constraints", t: "Under 180 words, neutral tone; where data is stale, say so - do not guess." },
      { k: "examples", t: 'Phrase risks concretely, e.g. "Concentration: 62% of revenue from two buyers."' },
    ],
  },
  {
    num: "2.2",
    name: "Requirements summary",
    ask: "Turn messy business requirement notes into a proper BRD. Which prompt gets you a document you could actually circulate?",
    artifact:
      "REQUIREMENT NOTES (SYNTHETIC, EXCERPT) - 'Branch users want faster approval for top-up loans. If existing customer >2 yrs vintage, skip income docs (but compliance said only below 5 lakh?). Bureau pull cached 30 days (risk to confirm). Out of scope: NRI customers (maybe phase 2). Auto-reject if score below 650 unless RM override.' BRD STANDARD - numbered FR-xx requirements with acceptance criteria; ambiguities logged, never resolved by the author.",
    prompts: [
      { label: "Prompt A", tier: "okay", text: "Turn these notes into a structured requirements document with sections for scope, functional requirements and open questions. Keep it under two pages." },
      { label: "Prompt B", tier: "fant", text: 'You are a senior business analyst in a lending technology team. These notes will become a BRD reviewed by architecture and compliance, and must follow the BRD standard provided. Draft the BRD as: 1) Objective, 2) In/out of scope, 3) Functional requirements numbered FR-01… each with acceptance criteria, 4) NFRs, 5) Dependencies, 6) Open questions. Do not invent or resolve anything - ambiguous or conflicting notes go under open questions. Write requirements testably, e.g. "FR-03: The system shall auto-flag applications where bureau score < 650."' },
      { label: "Prompt C", tier: "over", text: "Act simultaneously as a business analyst, project manager, solution architect, compliance officer and UX researcher. Convert the notes into a BRD, plus user stories, test cases, a RACI matrix, a Gantt plan, API specifications and a data dictionary. Resolve every ambiguity yourself using best judgement, add any requirements you believe the business forgot, and keep the whole thing under one page." },
      { label: "Prompt D", tier: "bad", text: "Summarise these requirements." },
    ],
    segs: [
      { k: "role", t: "You are a senior business analyst in a lending technology team." },
      { k: "context", t: "These notes will become a BRD reviewed by architecture and compliance, and must follow the BRD standard provided." },
      { k: "task", t: "Draft the BRD" },
      { k: "format", t: "as: 1) Objective, 2) In/out of scope, 3) Functional requirements numbered FR-01… each with acceptance criteria, 4) NFRs, 5) Dependencies, 6) Open questions." },
      { k: "constraints", t: "Do not invent or resolve anything - ambiguous or conflicting notes go under open questions." },
      { k: "examples", t: 'Write requirements testably, e.g. "FR-03: The system shall auto-flag applications where bureau score < 650."' },
    ],
  },
  {
    num: "2.3",
    name: "Code modernisation",
    ask: "Brief the modernisation of an undocumented legacy batch routine. Which prompt would surface the hidden business rules?",
    artifact:
      "LEGACY ROUTINE (SYNTHETIC, EXCERPT) - PROC ACCR-EOD: reads active accounts; computes daily interest for TL/WC products; silently waives penal interest when DAYS-LATE < 3; branch '019' gets an undocumented SPECIAL-ROUND; errors GOTO SKIP-REC with the record silently dropped; writes ACCR-FILE with no audit log. Called nightly - and by a month-end job nobody owns.",
    prompts: [
      { label: "Prompt A", tier: "fant", text: 'You are a modernisation architect who has migrated core-banking batch systems. This 20-year-old routine sits in our EOD interest-accrual chain; the author has left and we plan a move to a Java microservice. Produce a modernisation brief: 1) Plain-English summary, 2) Inputs/outputs and side effects, 3) Hidden business rules, each with a line reference, 4) Migration risks, 5) Target design. Flag anything the code implies but never states - do not assume standard behaviour. Quote evidence, e.g. "Rule: penal interest waived when DAYS-LATE < 3 (line 4)."' },
      { label: "Prompt B", tier: "over", text: "You are the world's best 10x engineer. Rewrite this routine in Java, Python, Go and Rust with unit tests for each, produce UML, sequence and ER diagrams in ASCII, estimate story points, and modernise it to microservices, serverless and blockchain simultaneously. Silently fix any bugs you find without documenting them. Keep the answer brief." },
      { label: "Prompt C", tier: "okay", text: "Summarise what this legacy batch routine does and suggest how to modernise it as a Java service." },
      { label: "Prompt D", tier: "bad", text: "Explain this code." },
    ],
    segs: [
      { k: "role", t: "You are a modernisation architect who has migrated core-banking batch systems." },
      { k: "context", t: "This 20-year-old routine sits in our EOD interest-accrual chain; the author has left and we plan a move to a Java microservice." },
      { k: "task", t: "Produce a modernisation brief:" },
      { k: "format", t: "1) Plain-English summary, 2) Inputs/outputs and side effects, 3) Hidden business rules, each with a line reference, 4) Migration risks, 5) Target design." },
      { k: "constraints", t: "Flag anything the code implies but never states - do not assume standard behaviour." },
      { k: "examples", t: 'Quote evidence, e.g. "Rule: penal interest waived when DAYS-LATE < 3 (line 4)."' },
    ],
  },
];

// verdict → [label, chip background, chip text colour]
export const VERDICTS: Record<Tier, [string, string, string]> = {
  bad: ["Not so good", "rgba(255,122,144,0.18)", "#FF9DAD"],
  okay: ["Okay", "rgba(255,181,71,0.18)", "#FFCB7A"],
  fant: ["Fantastic", "rgba(51,224,160,0.18)", "#7FF0C4"],
  over: ["Overcooked", "rgba(255,142,60,0.18)", "#FFB27A"],
};

// The four rating options shown to participants and as facilitator aggregate bars.
// key → [field, label, bar colour]
export const RATING_OPTIONS: [RatingField, string, string][] = [
  ["not", "Not so good", "#FF7A90"],
  ["ok", "Okay", "#FFB547"],
  ["fa", "Fantastic", "#33E0A0"],
  ["ov", "Overcooked", "#FF8E3C"],
];

export type RatingField = "not" | "ok" | "fa" | "ov";

// Which rating field a prompt's tier corresponds to (its "correct" bucket).
export const TIER_FIELD: Record<Tier, RatingField> = {
  bad: "not",
  okay: "ok",
  fant: "fa",
  over: "ov",
};

export const COLORS: Record<FrameworkKey, string> = {
  role: "#00B8F5",
  context: "#9F7BFF",
  task: "#63E6BE",
  format: "#FFB547",
  constraints: "#FF7A90",
  examples: "#ACEAFF",
};

export interface LegendItem {
  k: FrameworkKey;
  name: string;
  tip: string;
  short: string;
}

export const LEGEND: LegendItem[] = [
  { k: "role", name: "Role", tip: "Role - who the model should be; sets expertise and voice.", short: "Who should the AI be? An analyst, an RM, an architect." },
  { k: "context", name: "Context", tip: "Context - the situation and audience it needs to know about.", short: "The situation, the audience, what they already know." },
  { k: "task", name: "Task", tip: "Task - the specific job to do.", short: "One clear, specific job." },
  { k: "format", name: "Format", tip: "Format - exactly how the answer should be structured.", short: "The exact structure you want back." },
  { k: "constraints", name: "Constraints / Tone", tip: "Constraints & tone - length, register, and what to avoid.", short: "Length, tone, and what to avoid." },
  { k: "examples", name: "Examples", tip: "Examples - a sample of the standard you expect.", short: "Show a sample of the standard you expect." },
];

// Session constants
export const SESSION_CODE = "4271";
export const CODE_DIGITS = ["4", "2", "7", "1"];
export const MAX_RUNS_PER_SCENARIO = 3;
export const CLAUDE_MODEL = "claude-sonnet-4-5";
export const MAX_TOKENS = 700;
