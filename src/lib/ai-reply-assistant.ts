// ---------------------------------------------------------------------------
// AI Reply Assistant
//
// Generates 3 professional, tone-matched reply suggestions when viewing
// a client email or message. Uses the configured LLM, or falls back to
// smart template-based suggestions.
// ---------------------------------------------------------------------------

export type ReplyTone = "professional" | "friendly" | "formal" | "casual";

export interface ReplySuggestion {
  id: string;
  tone: ReplyTone;
  subject?: string;
  body: string;
  label: string;
}

const TONE_LABELS: Record<ReplyTone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  formal: "Formal",
  casual: "Casual",
};

/**
 * Generate reply suggestions using the configured LLM, or fall back to
 * template-based suggestions.
 */
export async function generateReplySuggestions(params: {
  originalMessage: string;
  clientName?: string;
  projectName?: string;
  context?: string;
  tone?: ReplyTone;
}): Promise<ReplySuggestion[]> {
  const { originalMessage, clientName, projectName, context, tone } = params;

  // Try LLM first
  const apiKey = process.env.USER_LLM_API_KEY;
  const baseUrl = process.env.USER_LLM_BASE_URL;
  const model = process.env.USER_LLM_MODEL;

  if (apiKey && baseUrl && model) {
    try {
      return await generateWithLLM({
        apiKey,
        baseUrl,
        model,
        originalMessage,
        clientName,
        projectName,
        context,
        tone,
      });
    } catch {
      // Fall through to template suggestions
    }
  }

  return generateTemplateSuggestions({ originalMessage, clientName, projectName, context, tone });
}

/**
 * Generate reply suggestions using an LLM API.
 */
async function generateWithLLM(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  originalMessage: string;
  clientName?: string;
  projectName?: string;
  context?: string;
  tone?: ReplyTone;
}): Promise<ReplySuggestion[]> {
  const { apiKey, baseUrl, model, originalMessage, clientName, projectName, context, tone } = params;

  const tonesToGenerate: ReplyTone[] = tone
    ? [tone, ...(["professional", "friendly", "formal"] as ReplyTone[]).filter((t) => t !== tone).slice(0, 2)]
    : ["professional", "friendly", "formal"];

  const prompt = `You are an expert email assistant for a web development agency called Sardar IT.
Generate ${tonesToGenerate.length} different reply options for this message.

ORIGINAL MESSAGE:
${originalMessage}

${clientName ? `Client name: ${clientName}` : ""}
${projectName ? `Project: ${projectName}` : ""}
${context ? `Additional context: ${context}` : ""}

For each reply, provide:
- A brief label (e.g., "Professional & direct")
- The reply body

Format your response as a JSON array with objects containing "label" and "body" fields.
Keep replies concise (2-4 paragraphs max). Be specific to the original message.
Do NOT include subject lines.`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`LLM API returned ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Try to parse JSON from the response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Invalid LLM response format");

  const parsed = JSON.parse(jsonMatch[0]) as Array<{ label: string; body: string }>;

  return parsed.map((item, i) => ({
    id: `reply-${Date.now()}-${i}`,
    tone: tonesToGenerate[i] ?? "professional",
    body: item.body,
    label: item.label || `${TONE_LABELS[tonesToGenerate[i] ?? "professional"]} reply`,
  }));
}

/**
 * Generate template-based reply suggestions (no LLM required).
 */
function generateTemplateSuggestions(params: {
  originalMessage: string;
  clientName?: string;
  projectName?: string;
  context?: string;
  tone?: ReplyTone;
}): ReplySuggestion[] {
  const { originalMessage, clientName, projectName, context, tone } = params;
  const name = clientName ?? "there";
  const project = projectName ?? "your project";
  const lowerMsg = originalMessage.toLowerCase();

  // Detect the type of message
  const isQuestion = lowerMsg.includes("?") || lowerMsg.startsWith("hi") || lowerMsg.startsWith("hello");
  const isComplaint = lowerMsg.includes("issue") || lowerMsg.includes("problem") || lowerMsg.includes("broken") || lowerMsg.includes("urgent");
  const isPayment = lowerMsg.includes("invoice") || lowerMsg.includes("payment") || lowerMsg.includes("pay");
  const isDeadline = lowerMsg.includes("deadline") || lowerMsg.includes("due") || lowerMsg.includes("late") || lowerMsg.includes("delay");
  const isPositive = lowerMsg.includes("great") || lowerMsg.includes("excellent") || lowerMsg.includes("thank") || lowerMsg.includes("awesome");

  const selectedTones: ReplyTone[] = tone
    ? [tone, ...(["professional", "friendly", "formal"] as ReplyTone[]).filter((t) => t !== tone).slice(0, 2)]
    : ["professional", "friendly", "formal"];

  return selectedTones.map((t, i) => ({
    id: `reply-${Date.now()}-${i}`,
    tone: t,
    label: `${TONE_LABELS[t]} reply`,
    body: generateBody(t, { name, project, isQuestion, isComplaint, isPayment, isDeadline, isPositive }),
  }));
}

function generateBody(
  tone: ReplyTone,
  ctx: {
    name: string;
    project: string;
    isQuestion: boolean;
    isComplaint: boolean;
    isPayment: boolean;
    isDeadline: boolean;
    isPositive: boolean;
  },
): string {
  const { name, project, isQuestion, isComplaint, isPayment, isDeadline, isPositive } = ctx;

  const greeting =
    tone === "casual"
      ? `Hey ${name}!`
      : tone === "friendly"
        ? `Hi ${name}!`
        : tone === "formal"
          ? `Dear ${name},`
          : `Hi ${name},`;

  const closing =
    tone === "casual"
      ? "Cheers!"
      : tone === "friendly"
        ? "Best wishes!"
        : tone === "formal"
          ? "Sincerely,"
          : "Best regards,";

  const signature = "Sardar IT Team";

  if (isComplaint) {
    if (tone === "formal") {
      return `${greeting}\n\nThank you for bringing this to our attention. I sincerely apologize for the inconvenience you've experienced with ${project}.\n\nWe take this matter seriously and have already begun investigating the issue. I will provide you with a detailed update within the next 24 hours.\n\nIn the meantime, if you have any additional information to share, please don't hesitate to reach out.\n\n${closing}\n${signature}`;
    }
    if (tone === "friendly") {
      return `${greeting}\n\nI'm really sorry about the trouble you're having! I completely understand how frustrating this must be.\n\nThe team is already looking into it and we'll have a fix ready for you very soon. I'll keep you posted every step of the way.\n\nLet me know if there's anything else I can help with in the meantime!\n\n${closing}\n${signature}`;
    }
    return `${greeting}\n\nThanks for flagging this — I apologize for the inconvenience.\n\nWe're on it. Our team is investigating and we'll have this resolved shortly. I'll send you an update as soon as we have a fix in place.\n\nPlease let me know if you have any questions.\n\n${closing}\n${signature}`;
  }

  if (isPayment) {
    if (tone === "formal") {
      return `${greeting}\n\nThank you for your message regarding the payment for ${project}.\n\nI would like to confirm that we have received your inquiry and will review the invoice details promptly. If you have any specific questions about the charges or payment terms, please feel free to share them.\n\nWe appreciate your business and look forward to continuing our collaboration.\n\n${closing}\n${signature}`;
    }
    if (tone === "friendly") {
      return `${greeting}\n\nThanks for reaching out about the invoice for ${project}!\n\nHappy to help sort this out. If you have any questions about the breakdown or need a different payment arrangement, just let me know.\n\nWe really appreciate working with you!\n\n${closing}\n${signature}`;
    }
    return `${greeting}\n\nThank you for your message regarding the payment for ${project}.\n\nI'll review the details and get back to you shortly. If you have any questions about the invoice, feel free to ask.\n\n${closing}\n${signature}`;
  }

  if (isDeadline) {
    if (tone === "formal") {
      return `${greeting}\n\nThank you for your message. I understand there are concerns regarding the timeline for ${project}.\n\nWe are committed to delivering quality work and are actively working to meet the agreed-upon deadlines. I will provide you with a progress update and revised timeline shortly.\n\nPlease let me know if you'd like to schedule a call to discuss this further.\n\n${closing}\n${signature}`;
    }
    if (tone === "friendly") {
      return `${greeting}\n\nThanks for checking in on the timeline! I completely understand the importance of staying on track.\n\nThe team is making good progress on ${project} and I'll have a detailed update for you very soon. If you'd like to jump on a quick call, I'm happy to walk you through where things stand.\n\n${closing}\n${signature}`;
    }
    return `${greeting}\n\nThank you for your message regarding the timeline for ${project}.\n\nWe're actively working to meet our deadlines and I'll share a progress update shortly. Let me know if you have any concerns.\n\n${closing}\n${signature}`;
  }

  if (isPositive) {
    if (tone === "casual") {
      return `${greeting}\n\nSo glad to hear that! Your feedback means the world to us. 😊\n\nWe've really enjoyed working on ${project} and can't wait to show you what's next.\n\n${closing}\n${signature}`;
    }
    if (tone === "friendly") {
      return `${greeting}\n\nThank you so much for the kind words! We're thrilled that you're happy with the work on ${project}.\n\nIt's been a pleasure working with you, and we look forward to the next milestones.\n\n${closing}\n${signature}`;
    }
    return `${greeting}\n\nThank you for your positive feedback regarding ${project}. We greatly appreciate your recognition of our team's efforts.\n\nIt is our pleasure to work with you, and we remain committed to delivering excellence.\n\n${closing}\n${signature}`;
  }

  // Default response (question or general)
  if (tone === "casual") {
    return `${greeting}\n\nThanks for reaching out! I've got your message about ${project} and I'm on it.\n\nLet me look into this and I'll get back to you shortly with all the details.\n\n${closing}\n${signature}`;
  }
  if (tone === "friendly") {
    return `${greeting}\n\nThanks for your message! I've received your notes about ${project} and I'll review them right away.\n\nI'll follow up with a detailed response shortly. In the meantime, feel free to share any additional details.\n\n${closing}\n${signature}`;
  }
  return `${greeting}\n\nThank you for your message. I have received your inquiry regarding ${project} and will review it promptly.\n\nI will follow up with a detailed response at the earliest opportunity.\n\n${closing}\n${signature}`;
}
