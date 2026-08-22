import { renderTemplate } from "@/lib/template-render";
import { generateTrackingId, trackingPixel, wrapLinksForTracking } from "@/lib/email-tracking";
import type { Client, EmailTemplate } from "@/lib/types";

// ---------------------------------------------------------------------------
// Email sending abstraction.
// Uses Resend REST API when RESEND_API_KEY is set; otherwise falls back to a
// no-op (demo mode) that logs the email to the activity feed without
// actually sending anything.
// ---------------------------------------------------------------------------

interface SendEmailResult {
  ok: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send an email via Resend REST API.
 * In demo mode (no API key), this returns a simulated success.
 */
export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  // Demo mode: simulate sending
  if (!apiKey) {
    return {
      ok: true,
      messageId: `demo-${Date.now()}`,
    };
  }

  try {
    const from = params.from || process.env.EMAIL_FROM || "Sardar CRM <noreply@sardaritbd.com>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      return { ok: false, error: body.message ?? "Failed to send email" };
    }

    return { ok: true, messageId: body.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email" };
  }
}

/**
 * Render a template and send it to a lead. Returns the rendered content
 * for logging purposes even if sending fails.
 */
export async function sendTemplateToLead(params: {
  lead: Client;
  template: EmailTemplate;
  senderName?: string | null;
  senderEmail?: string;
}): Promise<SendEmailResult & { renderedSubject: string; renderedBody: string; trackingId: string }> {
  const { lead, template, senderName, senderEmail } = params;

  const renderedSubject = template.subject
    ? renderTemplate(template.subject, lead, senderName)
    : `Follow-up from ${senderName ?? "Sardar IT"}`;
  const renderedBody = renderTemplate(template.body, lead, senderName);

  // Convert plain text to basic HTML
  const html = renderedBody
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  if (!lead.email) {
    return {
      ok: false,
      error: "Lead has no email address",
      renderedSubject,
      renderedBody,
      trackingId: "",
    };
  }

  // Add tracking
  const trackingId = generateTrackingId();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let trackedHtml = `<div style="font-family: sans-serif; line-height: 1.6;">${html}</div>`;
  trackedHtml += trackingPixel(trackingId, baseUrl);
  trackedHtml = wrapLinksForTracking(trackedHtml, trackingId, baseUrl);

  const result = await sendOutreachEmail({
    to: lead.email,
    subject: renderedSubject,
    html: trackedHtml,
    from: senderEmail,
  });

  return { ...result, renderedSubject, renderedBody, trackingId };
}
