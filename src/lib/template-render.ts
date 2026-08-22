import type { Client } from "@/lib/types";

/**
 * Render an email template by replacing personalization variables
 * with actual lead/client data.
 *
 * Supported variables:
 * - {{first_name}}    → first word of the client's name
 * - {{company}}       → client company
 * - {{website}}       → client website URL
 * - {{main_problem}}  → main problem found during website review
 * - {{country}}       → client country
 * - {{client_name}}   → full client name (legacy)
 * - {{project_name}}  → falls back to company name
 * - {{your_name}}     → passed as参数
 */
export function renderTemplate(
  template: string,
  lead: Client,
  senderName?: string | null,
): string {
  const firstName = lead.name.split(" ")[0] ?? lead.name;

  const variables: Record<string, string> = {
    "{{first_name}}": firstName,
    "{{company}}": lead.company ?? "",
    "{{website}}": lead.website ?? "",
    "{{main_problem}}": lead.main_problem_found ?? "",
    "{{country}}": lead.country ?? "",
    "{{client_name}}": lead.name,
    "{{project_name}}": lead.company ?? lead.name,
    "{{your_name}}": senderName ?? "Sardar IT",
    "{{industry}}": lead.industry ?? "",
    "{{email}}": lead.email ?? "",
    "{{linkedin_url}}": lead.linkedin_url ?? "",
  };

  let result = template;
  for (const [variable, value] of Object.entries(variables)) {
    result = result.split(variable).join(value);
  }
  return result;
}
