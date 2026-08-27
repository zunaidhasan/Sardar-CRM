// ---------------------------------------------------------------------------
// Notification Webhooks (Slack / WhatsApp / Custom)
//
// Fires outbound notifications when key CRM events happen:
//   - New lead added
//   - Deal marked "Won"
//   - Invoice paid
//   - Project created
//
// Supports Slack (via incoming webhook URL), WhatsApp (via Meta Cloud API),
// and custom HTTP endpoints. Configuration is stored in the demo DB or
// Supabase and managed from Settings → Integrations.
// ---------------------------------------------------------------------------

export interface WebhookConfig {
  id: string;
  user_id: string;
  name: string;
  type: "slack" | "whatsapp" | "custom";
  url: string;
  is_active: boolean;
  events: WebhookEvent[];
  created_at: string;
  updated_at: string;
}

export type WebhookEvent =
  | "lead.created"
  | "deal.won"
  | "invoice.paid"
  | "project.created"
  | "invoice.overdue";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "lead.created": "📩 New Lead Added",
  "deal.won": "🎉 Deal Won!",
  "invoice.paid": "💰 Invoice Paid",
  "project.created": "📋 Project Created",
  "invoice.overdue": "⚠️ Invoice Overdue",
};

/**
 * Format a webhook payload for Slack (Block Kit message).
 */
export function formatSlackMessage(payload: WebhookPayload): object {
  const label = EVENT_LABELS[payload.event] ?? payload.event;
  const fields = Object.entries(payload.data)
    .map(([key, value]) => ({
      type: "mrkdwn" as const,
      text: `*${key}:* ${value ?? "N/A"}`,
    }));

  return {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: label, emoji: true },
      },
      {
        type: "section",
        fields,
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Sent by Sardar CRM • ${new Date(payload.timestamp).toLocaleString()}`,
          },
        ],
      },
    ],
  };
}

/**
 * Format a webhook payload for WhatsApp (Meta Cloud API text message).
 */
export function formatWhatsAppMessage(payload: WebhookPayload): object {
  const label = EVENT_LABELS[payload.event] ?? payload.event;
  const lines = Object.entries(payload.data).map(
    ([key, value]) => `*${key}:* ${value ?? "N/A"}`,
  );

  return {
    messaging_product: "whatsapp",
    to: "", // Phone number must be set by the caller
    type: "text",
    text: {
      body: `${label}\n\n${lines.join("\n")}\n\n_Sardar CRM • ${new Date(payload.timestamp).toLocaleString()}_`,
    },
  };
}

/**
 * Format a webhook payload for a custom HTTP endpoint (JSON).
 */
export function formatCustomMessage(payload: WebhookPayload): object {
  return {
    event: payload.event,
    timestamp: payload.timestamp,
    ...payload.data,
  };
}

/**
 * Fire a webhook notification. Resilient — errors are swallowed so
 * notification failures never block the main action.
 */
export async function fireWebhook(
  config: WebhookConfig,
  payload: WebhookPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    let body: string;

    switch (config.type) {
      case "slack":
        body = JSON.stringify(formatSlackMessage(payload));
        break;
      case "whatsapp":
        body = JSON.stringify(formatWhatsAppMessage(payload));
        break;
      case "custom":
      default:
        body = JSON.stringify(formatCustomMessage(payload));
        break;
    }

    const res = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Build a webhook payload for common CRM events.
 */
export function buildPayload(
  event: WebhookEvent,
  data: Record<string, unknown>,
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Fire all active webhooks for a given event.
 */
export async function fireEventWebhooks(
  configs: WebhookConfig[],
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<{ fired: number; errors: string[] }> {
  const active = configs.filter((c) => c.is_active && c.events.includes(event));
  if (active.length === 0) return { fired: 0, errors: [] };

  const payload = buildPayload(event, data);
  const results = await Promise.allSettled(
    active.map((c) => fireWebhook(c, payload)),
  );

  let fired = 0;
  const errors: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === "fulfilled" && r.value.ok) {
      fired++;
    } else {
      const err =
        r.status === "rejected"
          ? String(r.reason)
          : r.value.error ?? "Unknown";
      errors.push(`${active[i]!.name}: ${err}`);
    }
  }
  return { fired, errors };
}
