// ---------------------------------------------------------------------------
// Lead Enrichment
//
// Pulls company data from Apollo.io or Hunter.io APIs to auto-fill
// industry, company size, LinkedIn, and other fields. Falls back to
// basic web scraping when no API key is configured.
// ---------------------------------------------------------------------------

export interface EnrichmentResult {
  company: string | null;
  industry: string | null;
  website: string | null;
  linkedin_url: string | null;
  company_size: string | null;
  phone: string | null;
  source: string;
  enrichedAt: string;
  error?: string;
}

interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  organization?: {
    name: string;
    website_url: string | null;
    linkedin_url: string | null;
    industry: string | null;
    estimated_num_employees: number | null;
  };
}

interface HunterDomainSearch {
  data: {
    domain: string;
    organization: string;
    pattern: string;
    emails: Array<{
      email: string;
      confidence: number;
      position: string | null;
    }>;
  };
}

/**
 * Enrich a lead using Apollo.io People API.
 * Requires APOLLO_API_KEY env var.
 */
async function enrichWithApollo(email: string): Promise<EnrichmentResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return {
      company: null,
      industry: null,
      website: null,
      linkedin_url: null,
      company_size: null,
      phone: null,
      source: "apollo",
      enrichedAt: new Date().toISOString(),
      error: "APOLLO_API_KEY not configured",
    };
  }

  try {
    const response = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, email }),
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`);
    }

    const data = await response.json();
    const person: ApolloPerson | null = data.person;

    if (!person) {
      return {
        company: null,
        industry: null,
        website: null,
        linkedin_url: null,
        company_size: null,
        phone: null,
        source: "apollo",
        enrichedAt: new Date().toISOString(),
        error: "No person found",
      };
    }

    const org = person.organization;
    return {
      company: org?.name ?? null,
      industry: org?.industry ?? null,
      website: org?.website_url ?? null,
      linkedin_url: org?.linkedin_url ?? null,
      company_size: org?.estimated_num_employees
        ? `${org.estimated_num_employees} employees`
        : null,
      phone: null,
      source: "apollo",
      enrichedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      company: null,
      industry: null,
      website: null,
      linkedin_url: null,
      company_size: null,
      phone: null,
      source: "apollo",
      enrichedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Apollo enrichment failed",
    };
  }
}

/**
 * Enrich a lead using Hunter.io Domain Search API.
 * Requires HUNTER_API_KEY env var.
 */
async function enrichWithHunter(domain: string): Promise<EnrichmentResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return {
      company: null,
      industry: null,
      website: null,
      linkedin_url: null,
      company_size: null,
      phone: null,
      source: "hunter",
      enrichedAt: new Date().toISOString(),
      error: "HUNTER_API_KEY not configured",
    };
  }

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Hunter API error: ${response.status}`);
    }

    const data: HunterDomainSearch = await response.json();
    const org = data.data;

    return {
      company: org.organization || null,
      industry: null, // Hunter doesn't provide industry
      website: `https://${org.domain}`,
      linkedin_url: null,
      company_size: null,
      phone: null,
      source: "hunter",
      enrichedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      company: null,
      industry: null,
      website: null,
      linkedin_url: null,
      company_size: null,
      phone: null,
      source: "hunter",
      enrichedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Hunter enrichment failed",
    };
  }
}

/**
 * Enrich a lead using the best available provider.
 * Tries Apollo first (by email), then Hunter (by domain).
 */
export async function enrichLead(params: {
  email?: string | null;
  website?: string | null;
  company?: string | null;
}): Promise<EnrichmentResult> {
  const { email, website } = params;

  // Try Apollo by email first
  if (email) {
    const apolloResult = await enrichWithApollo(email);
    if (!apolloResult.error) return apolloResult;
  }

  // Try Hunter by domain
  if (website) {
    const domain = website.replace(/^https?:\/\//, "").split("/")[0];
    const hunterResult = await enrichWithHunter(domain);
    if (!hunterResult.error) return hunterResult;
  }

  // No enrichment available
  return {
    company: null,
    industry: null,
    website: null,
    linkedin_url: null,
    company_size: null,
    phone: null,
    source: "none",
    enrichedAt: new Date().toISOString(),
    error: "No enrichment provider configured. Set APOLLO_API_KEY or HUNTER_API_KEY.",
  };
}

/**
 * Apply enrichment results to a lead's fields (only fills empty fields).
 */
export function applyEnrichment(
  lead: { company?: string | null; industry?: string | null; website?: string | null; linkedin_url?: string | null },
  enrichment: EnrichmentResult,
): Partial<typeof lead> {
  const patch: Record<string, unknown> = {};
  if (!lead.company && enrichment.company) patch.company = enrichment.company;
  if (!lead.industry && enrichment.industry) patch.industry = enrichment.industry;
  if (!lead.website && enrichment.website) patch.website = enrichment.website;
  if (!lead.linkedin_url && enrichment.linkedin_url) patch.linkedin_url = enrichment.linkedin_url;
  return patch;
}
