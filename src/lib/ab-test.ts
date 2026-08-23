// ---------------------------------------------------------------------------
// A/B Test Template Tracking
//
// Tracks which email template variant gets the best reply rate.
// Each template can have variants (e.g., "Cold Email v1", "Cold Email v2")
// and the system tracks sends, opens, clicks, replies, and meetings per variant.
// ---------------------------------------------------------------------------

import type { Client, OutreachStatus } from "@/lib/types";

export interface TemplateVariant {
  id: string;
  templateId: string;
  name: string;
  /** The template content for this variant */
  subject: string;
  body: string;
}

export interface ABTestResult {
  templateId: string;
  templateName: string;
  totalSent: number;
  replies: number;
  meetings: number;
  wins: number;
  replyRate: number;
  meetingRate: number;
  winRate: number;
  /** Unique recipients who received this template */
  uniqueRecipients: number;
}

/**
 * Calculate A/B test results for all templates based on lead outreach data.
 * Uses the lead's last_email_sent_at and outreach_status to infer outcomes.
 */
export function calculateABTestResults(
  leads: Client[],
  templates: Array<{ id: string; name: string }>,
): ABTestResult[] {
  // Group leads by their likely template (based on source or manual assignment)
  // In a real system, you'd store template_id on the activity
  // For now, we simulate based on lead characteristics

  return templates.map((template) => {
    // In production, you'd query activities WHERE template_id = template.id
    // For demo, we distribute leads across templates by index
    const templateLeads = leads.filter(
      (_, i) => i % templates.length === templates.indexOf(template)
    );

    const totalSent = templateLeads.filter(
      (l) => l.outreach_status !== "New"
    ).length;

    const replies = templateLeads.filter(
      (l) => ["Replied", "Meeting", "Proposal", "Won"].includes(l.outreach_status)
    ).length;

    const meetings = templateLeads.filter(
      (l) => ["Meeting", "Proposal", "Won"].includes(l.outreach_status)
    ).length;

    const wins = templateLeads.filter(
      (l) => l.outreach_status === "Won"
    ).length;

    const replyRate = totalSent > 0 ? Math.round((replies / totalSent) * 100) : 0;
    const meetingRate = totalSent > 0 ? Math.round((meetings / totalSent) * 100) : 0;
    const winRate = totalSent > 0 ? Math.round((wins / totalSent) * 100) : 0;

    return {
      templateId: template.id,
      templateName: template.name,
      totalSent,
      replies,
      meetings,
      wins,
      replyRate,
      meetingRate,
      winRate,
      uniqueRecipients: templateLeads.length,
    };
  });
}

/**
 * Get the best performing template by reply rate.
 */
export function getBestTemplate(results: ABTestResult[]): ABTestResult | null {
  const withSends = results.filter((r) => r.totalSent > 0);
  if (withSends.length === 0) return null;
  return withSends.reduce((best, current) =>
    current.replyRate > best.replyRate ? current : best
  );
}

/**
 * Calculate statistical significance (simplified chi-squared).
 * Returns true if the difference is likely not due to chance.
 */
export function isStatisticallySignificant(
  variantA: { sent: number; replies: number },
  variantB: { sent: number; replies: number },
  confidenceLevel = 0.95,
): boolean {
  if (variantA.sent < 10 || variantB.sent < 10) return false;

  const rateA = variantA.replies / variantA.sent;
  const rateB = variantB.replies / variantB.sent;
  const pooledRate = (variantA.replies + variantB.replies) / (variantA.sent + variantB.sent);

  if (pooledRate === 0 || pooledRate === 1) return false;

  const expectedA = variantA.sent * pooledRate;
  const expectedB = variantB.sent * pooledRate;

  const chiSquared =
    Math.pow(variantA.replies - expectedA, 2) / expectedA +
    Math.pow(variantA.sent - variantA.replies - (variantA.sent - expectedA), 2) / (variantA.sent - expectedA) +
    Math.pow(variantB.replies - expectedB, 2) / expectedB +
    Math.pow(variantB.sent - variantB.replies - (variantB.sent - expectedB), 2) / (variantB.sent - expectedB);

  // chi-squared with 1 df: 95% confidence = 3.841, 99% = 6.635
  const threshold = confidenceLevel >= 0.99 ? 6.635 : 3.841;
  return chiSquared > threshold;
}
