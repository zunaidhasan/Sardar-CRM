// ---------------------------------------------------------------------------
// Email Sending Integration
//
// Supports Resend and SendGrid for sending outbound emails.
// Falls back gracefully when no provider is configured.
//
// Environment variables:
//   EMAIL_PROVIDER  — "resend" | "sendgrid" (default: "resend")
//   RESEND_API_KEY  — Resend API key
//   SENDGRID_API_KEY — SendGrid API key
//   FROM_EMAIL      — Sender email address (must be verified)
//   FROM_NAME       — Sender display name
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  provider: string;
}

function getProvider(): string {
  return process.env.EMAIL_PROVIDER ?? "resend";
}

function getFromEmail(): string {
  return process.env.FROM_EMAIL ?? "noreply@sardaritbd.com";
}

function getFromName(): string {
  return process.env.FROM_NAME ?? "Sardar CRM";
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

async function sendWithResend(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured", provider: "resend" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${getFromName()} <${getFromEmail()}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
        tags: params.tags,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: `Resend API error ${res.status}: ${(err as { message?: string }).message ?? "unknown"}`,
        provider: "resend",
      };
    }

    const data = await res.json();
    return { ok: true, id: data.id, provider: "resend" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Resend request failed",
      provider: "resend",
    };
  }
}

// ---------------------------------------------------------------------------
// SendGrid
// ---------------------------------------------------------------------------

async function sendWithSendGrid(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "SENDGRID_API_KEY not configured", provider: "sendgrid" };
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: getFromEmail(), name: getFromName() },
        subject: params.subject,
        content: [
          { type: "text/html", value: params.html },
          ...(params.text ? [{ type: "text/plain", value: params.text }] : []),
        ],
        reply_to: params.replyTo ? { email: params.replyTo } : undefined,
      }),
    });

    if (!res.ok && res.status !== 202) {
      const err = await res.text();
      return {
        ok: false,
        error: `SendGrid API error ${res.status}: ${err.slice(0, 200)}`,
        provider: "sendgrid",
      };
    }

    return { ok: true, provider: "sendgrid" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SendGrid request failed",
      provider: "sendgrid",
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send an email using the configured provider.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const provider = getProvider();
  if (provider === "sendgrid") {
    return sendWithSendGrid(params);
  }
  return sendWithResend(params);
}

/**
 * Check if an email provider is configured.
 */
export function isEmailConfigured(): boolean {
  const provider = getProvider();
  if (provider === "sendgrid") return Boolean(process.env.SENDGRID_API_KEY);
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Get the currently configured email provider name.
 */
export function getEmailProviderName(): string {
  return getProvider();
}

/**
 * Replace template variables in an email body/subject.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | null | undefined>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value ?? "");
  }
  return result;
}
