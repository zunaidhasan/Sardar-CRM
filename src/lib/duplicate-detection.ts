// ---------------------------------------------------------------------------
// Duplicate Lead Detection
//
// When adding a new lead, check for existing leads with the same email
// address or company name to prevent duplicates.
// ---------------------------------------------------------------------------

import type { Client } from "@/lib/types";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: "email" | "company" | "both" | null;
  existingLead: Client | null;
  message: string;
}

/**
 * Check if a new lead would duplicate an existing one.
 * Matches on normalized email (case-insensitive) and company name.
 */
export function checkForDuplicates(
  existingLeads: Client[],
  newEmail: string | null,
  newCompany: string | null,
  excludeId?: string,
): DuplicateCheckResult {
  const normEmail = newEmail?.trim().toLowerCase() || null;
  const normCompany = newCompany?.trim().toLowerCase() || null;

  if (!normEmail && !normCompany) {
    return { isDuplicate: false, matchType: null, existingLead: null, message: "" };
  }

  for (const lead of existingLeads) {
    // Skip the lead being edited
    if (excludeId && lead.id === excludeId) continue;

    const leadEmail = lead.email?.trim().toLowerCase() || null;
    const leadCompany = lead.company?.trim().toLowerCase() || null;

    const emailMatch = normEmail && leadEmail && normEmail === leadEmail;
    const companyMatch = normCompany && leadCompany && normCompany === leadCompany;

    if (emailMatch && companyMatch) {
      return {
        isDuplicate: true,
        matchType: "both",
        existingLead: lead,
        message: `This lead already exists as "${lead.name}" (${lead.company}, ${lead.email})`,
      };
    }

    if (emailMatch) {
      return {
        isDuplicate: true,
        matchType: "email",
        existingLead: lead,
        message: `Email "${normEmail}" already belongs to "${lead.name}" at ${lead.company ?? "unknown company"}`,
      };
    }

    if (companyMatch) {
      return {
        isDuplicate: true,
        matchType: "company",
        existingLead: lead,
        message: `Company "${newCompany}" already exists as "${lead.name}" (${lead.email ?? "no email"})`,
      };
    }
  }

  return { isDuplicate: false, matchType: null, existingLead: null, message: "" };
}
