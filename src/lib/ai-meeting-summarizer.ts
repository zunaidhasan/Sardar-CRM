// ---------------------------------------------------------------------------
// AI Meeting Summarizer
//
// Takes a meeting transcript (or raw notes) and extracts:
//   - A concise summary
//   - Action items with assignees and due dates
//   - Key decisions made
//
// Uses the configured LLM, or falls back to template-based extraction.
// ---------------------------------------------------------------------------

export interface MeetingSummary {
  summary: string;
  actionItems: ActionItem[];
  keyDecisions: string[];
  participants: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  assignee: string | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
}

/**
 * Summarize a meeting transcript using the configured LLM or templates.
 */
export async function summarizeMeeting(params: {
  transcript: string;
  projectName?: string;
  clientName?: string;
  meetingDate?: string;
}): Promise<MeetingSummary> {
  const { transcript, projectName, clientName, meetingDate } = params;

  // Try LLM first
  const apiKey = process.env.USER_LLM_API_KEY;
  const baseUrl = process.env.USER_LLM_BASE_URL;
  const model = process.env.USER_LLM_MODEL;

  if (apiKey && baseUrl && model) {
    try {
      return await summarizeWithLLM({
        apiKey,
        baseUrl,
        model,
        transcript,
        projectName,
        clientName,
        meetingDate,
      });
    } catch {
      // Fall through to template extraction
    }
  }

  return summarizeWithTemplates({ transcript, projectName, clientName, meetingDate });
}

/**
 * Summarize using an LLM API.
 */
async function summarizeWithLLM(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  transcript: string;
  projectName?: string;
  clientName?: string;
  meetingDate?: string;
}): Promise<MeetingSummary> {
  const { apiKey, baseUrl, model, transcript, projectName, clientName, meetingDate } = params;

  const prompt = `You are an expert meeting assistant for a web development agency called Sardar IT.
Analyze this meeting transcript and extract structured information.

MEETING TRANSCRIPT:
${transcript}

${projectName ? `Project: ${projectName}` : ""}
${clientName ? `Client: ${clientName}` : ""}
${meetingDate ? `Date: ${meetingDate}` : ""}

Extract and return a JSON object with:
{
  "summary": "A concise 2-3 sentence summary of what was discussed and decided",
  "actionItems": [
    {
      "title": "What needs to be done",
      "assignee": "Person name or null if unassigned",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "low|medium|high"
    }
  ],
  "keyDecisions": ["Decision 1", "Decision 2"],
  "participants": ["Person 1", "Person 2"]
}

Be specific. Extract real action items with clear owners when mentioned.
Set priority based on urgency indicators in the transcript.`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) throw new Error(`LLM API returned ${res.status}`);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  // Try to parse JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid LLM response format");

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary: string;
    actionItems: Array<{
      title: string;
      assignee: string | null;
      dueDate: string | null;
      priority: string;
    }>;
    keyDecisions: string[];
    participants: string[];
  };

  return {
    summary: parsed.summary ?? "",
    actionItems: (parsed.actionItems ?? []).map((item, i) => ({
      id: `action-${Date.now()}-${i}`,
      title: item.title,
      assignee: item.assignee,
      dueDate: item.dueDate,
      priority: (["low", "medium", "high"].includes(item.priority) ? item.priority : "medium") as "low" | "medium" | "high",
    })),
    keyDecisions: parsed.keyDecisions ?? [],
    participants: parsed.participants ?? [],
  };
}

/**
 * Template-based extraction (no LLM required).
 * Extracts basic information using text pattern matching.
 */
function summarizeWithTemplates(params: {
  transcript: string;
  projectName?: string;
  clientName?: string;
  meetingDate?: string;
}): MeetingSummary {
  const { transcript, projectName, clientName, meetingDate } = params;

  // Extract potential action items (lines with "will", "need to", "should", "todo", "task")
  const actionPatterns = /^(?:.*?(?:will|need to|should|must|todo|task|action|follow up|send|create|update|review|check|fix|deploy|implement)).*$/gim;
  const actionMatches = transcript.match(actionPatterns) ?? [];

  const actionItems: ActionItem[] = actionMatches.slice(0, 10).map((line, i) => {
    const clean = line.replace(/^[\s\-•*]+/, "").trim();
    // Try to extract assignee (look for "X will" or "@X")
    const assigneeMatch = clean.match(/^(\w+\s+\w+)\s+(?:will|should|needs to)/i);
    return {
      id: `action-${Date.now()}-${i}`,
      title: clean.length > 100 ? clean.slice(0, 97) + "..." : clean,
      assignee: assigneeMatch?.[1] ?? null,
      dueDate: null,
      priority: clean.toLowerCase().includes("urgent") || clean.toLowerCase().includes("asap")
        ? "high"
        : clean.toLowerCase().includes("important")
          ? "medium"
          : "low",
    };
  });

  // Extract key decisions (lines with "decided", "agreed", "confirmed", "approved")
  const decisionPatterns = /^(?:.*?(?:decided|agreed|confirmed|approved|conclusion)).*$/gim;
  const keyDecisions = (transcript.match(decisionPatterns) ?? [])
    .slice(0, 5)
    .map((d) => d.replace(/^[\s\-•*]+/, "").trim());

  // Extract participants (look for names at start of lines or "Person said:")
  const participantPatterns = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s*:| said)/gm;
  const participantMatches = [...transcript.matchAll(participantPatterns)];
  const participants = [...new Set(participantMatches.map((m) => m[1]).filter(Boolean))];

  // Build summary
  const lines = transcript.split("\n").filter((l) => l.trim().length > 0);
  const summaryParts: string[] = [];
  if (projectName) summaryParts.push(`Meeting about ${projectName}.`);
  if (clientName) summaryParts.push(`Client: ${clientName}.`);
  if (meetingDate) summaryParts.push(`Date: ${meetingDate}.`);
  summaryParts.push(`${lines.length} lines of transcript analyzed.`);
  if (actionItems.length > 0) summaryParts.push(`${actionItems.length} action items identified.`);
  if (keyDecisions.length > 0) summaryParts.push(`${keyDecisions.length} key decisions found.`);

  return {
    summary: summaryParts.join(" "),
    actionItems,
    keyDecisions,
    participants,
  };
}
