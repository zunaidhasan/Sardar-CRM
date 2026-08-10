// ---------------------------------------------------------------------------
// AI Proposal Generator
//
// When the user configures their own LLM keys via USER_LLM_* env vars, this
// calls a real OpenAI-compatible chat-completions endpoint.
// Without keys it falls back to a high-quality template generator so the
// feature always works.
//
// Env vars (set in your hosting provider, NOT committed):
//   USER_LLM_API_KEY   - the API key you provide yourself
//   USER_LLM_BASE_URL  - e.g. https://api.deepseek.com/v1 (OpenAI-compatible)
//   USER_LLM_MODEL     - e.g. deepseek-chat
// ---------------------------------------------------------------------------

export type ProposalTone = "professional" | "friendly" | "confident" | "concise" | "consultative";

export interface ProposalInput {
  platform: string; // upwork | fiverr
  jobDescription: string;
  clientName?: string;
  projectName?: string;
  tone?: ProposalTone;
  budget?: string;
  timeline?: string;
  extraNotes?: string;
  yourName?: string;
}

const TONE_GUIDE: Record<ProposalTone, string> = {
  professional:
    "Keep the tone formal, precise and outcome-focused. Use complete sentences and business language.",
  friendly:
    "Keep the tone warm, approachable and personable. Be encouraging but still credible.",
  confident:
    "Project quiet confidence. Use assertive but not arrogant language, emphasize results and experience.",
  concise:
    "Be very brief. Short sentences, minimal fluff, maximum signal. 3-4 short paragraphs.",
  consultative:
    "Act like a thoughtful expert who asks questions, shows understanding of the problem, and offers a plan.",
};

function buildSystemPrompt(input: ProposalInput): string {
  const platformLabel = input.platform === "fiverr" ? "Fiverr" : "Upwork";
  const tone = TONE_GUIDE[input.tone ?? "professional"];
  return [
    `You are an expert ${platformLabel} freelancer writing a personalized cover letter / proposal for a client.`,
    tone,
    "Rules:",
    "- Never mention that you are an AI. Write as a real human freelancer.",
    "- Address the client's specific needs described in the job description.",
    "- Keep it under 180 words.",
    "- Do NOT invent fake metrics, portfolio links, or experience the user did not provide.",
    "- Use the client's name once if provided.",
    "- End with a clear call to action and invite a conversation.",
    "- Output only the proposal body in plain text. No subject line, no greeting header, no signature block.",
  ].join("\n");
}

async function callLLM(input: ProposalInput): Promise<string | null> {
  const apiKey = process.env.USER_LLM_API_KEY;
  const baseUrl = process.env.USER_LLM_BASE_URL;
  const model = process.env.USER_LLM_MODEL;
  if (!apiKey || !baseUrl || !model) return null;

  const messages = [
    {
      role: "system" as const,
      content: buildSystemPrompt(input),
    },
    {
      role: "user" as const,
      content: `JOB / GIG DESCRIPTION:\n${input.jobDescription}\n\nCLIENT NAME: ${input.clientName ?? "unknown"}\nPROJECT: ${input.projectName ?? "the project"}\nBUDGET: ${input.budget ?? "not specified"}\nTIMELINE: ${input.timeline ?? "not specified"}\nADDITIONAL NOTES: ${input.extraNotes ?? "none"}\n\nMY NAME: ${input.yourName ?? ""}`,
    },
  ];

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Template fallback
// ---------------------------------------------------------------------------
function templateFallback(input: ProposalInput): string {
  const platformLabel = input.platform === "fiverr" ? "Fiverr" : "Upwork";
  const name = input.clientName?.trim() ? `, ${input.clientName.trim()}` : "";
  const project = input.projectName?.trim() || "your project";
  const budgetLine = input.budget?.trim() ? `\n\nI can work within a budget around ${input.budget.trim()} and can propose a fixed-price breakdown that fits it.` : "";
  const timelineLine = input.timeline?.trim() ? `\n\nOn timing, I can have this in a strong first draft within ${input.timeline.trim()}.` : "";
  const notesLine = input.extraNotes?.trim() ? `\n\nYou mentioned: ${input.extraNotes.trim()}. I've factored that into how I'd approach the work.` : "";

  const intro = `Hi${name},\n\nI read through your description for ${project} and I can see exactly what you're trying to achieve. This is the kind of work I do on ${platformLabel} day in, day out — so I can move fast without the back-and-forth.`;

  const body = `Here's how I'd approach it: I'd start by locking down the requirements with you, then build a clean first pass you can react to early, and iterate until it's right. No surprises, no scope creep — just clear communication and solid delivery.`;

  const closing = `I'm available to start right away${budgetLine}${timelineLine}${notesLine}\n\nIf that sounds good, send me a message and we can jump on a quick call to confirm the details.\n\nBest regards,\n${input.yourName ?? ""}`;

  return `${intro}\n\n${body}\n\n${closing}`;
}

export async function generateProposal(input: ProposalInput): Promise<string> {
  const llm = await callLLM(input);
  return llm ?? templateFallback(input);
}
