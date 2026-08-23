// ---------------------------------------------------------------------------
// Website Audit Automation
//
// Runs a Lighthouse audit on a lead's website and extracts key problems.
// Uses Google's PageSpeed Insights API (free tier: 25,000 requests/day).
// Falls back to basic HTTP checks if the API key is not configured.
// ---------------------------------------------------------------------------

export interface AuditResult {
  url: string;
  score: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  mainProblem: string;
  detailedNotes: string;
  checkedAt: string;
  error?: string;
}

interface PSIResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number };
      accessibility?: { score: number };
    };
    audits?: {
      "first-contentful-paint"?: { score: number; displayValue: string };
      "speed-index"?: { score: number; displayValue: string };
      "largest-contentful-paint"?: { score: number; displayValue: string };
      "interactive"?: { score: number; displayValue: string };
      "cumulative-layout-shift"?: { score: number; displayValue: string };
      "total-blocking-time"?: { score: number; displayValue: string };
    };
  };
  error?: { message: string };
}

function extractProblem(psi: PSIResponse): { main: string; details: string } {
  const audits = psi.lighthouseResult?.audits ?? {};
  const perf = psi.lighthouseResult?.categories?.performance?.score ?? null;
  const a11y = psi.lighthouseResult?.categories?.accessibility?.score ?? null;

  const problems: string[] = [];
  const details: string[] = [];

  if (perf !== null && perf < 0.5) {
    problems.push("Very poor performance score");
  } else if (perf !== null && perf < 0.9) {
    problems.push("Below-average performance");
  }

  // Check specific metrics
  const fcp = audits["first-contentful-paint"];
  if (fcp && fcp.score !== null && fcp.score < 0.5) {
    problems.push("Slow initial load (FCP)");
    details.push(`First Contentful Paint: ${fcp.displayValue} (score: ${Math.round(fcp.score * 100)})`);
  }

  const lcp = audits["largest-contentful-paint"];
  if (lcp && lcp.score !== null && lcp.score < 0.5) {
    problems.push("Slow main content load (LCP)");
    details.push(`Largest Contentful Paint: ${lcp.displayValue} (score: ${Math.round(lcp.score * 100)})`);
  }

  const cls = audits["cumulative-layout-shift"];
  if (cls && cls.score !== null && cls.score < 0.5) {
    problems.push("Layout instability (CLS)");
    details.push(`Cumulative Layout Shift: ${cls.displayValue}`);
  }

  const tbt = audits["total-blocking-time"];
  if (tbt && tbt.score !== null && tbt.score < 0.5) {
    problems.push("High blocking time (TBT)");
    details.push(`Total Blocking Time: ${tbt.displayValue}`);
  }

  if (a11y !== null && a11y < 0.5) {
    problems.push("Poor accessibility");
    details.push(`Accessibility score: ${Math.round(a11y * 100)}`);
  }

  const main = problems.length > 0
    ? problems.slice(0, 2).join("; ")
    : (perf !== null && perf >= 0.9) ? "Good performance" : "Needs manual review";

  const fullDetails = details.length > 0
    ? `Performance: ${perf !== null ? Math.round(perf * 100) : "N/A"}\nAccessibility: ${a11y !== null ? Math.round(a11y * 100) : "N/A"}\n\n${details.join("\n")}`
    : `Performance: ${perf !== null ? Math.round(perf * 100) : "N/A"}\nAccessibility: ${a11y !== null ? Math.round(a11y * 100) : "N/A"}`;

  return { main, details: fullDetails };
}

/**
 * Run a Lighthouse audit on a website using Google PageSpeed Insights API.
 * Requires GOOGLE_PSI_API_KEY env var (optional — falls back to basic check).
 */
export async function runWebsiteAudit(url: string): Promise<AuditResult> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const checkedAt = new Date().toISOString();

  // Try PageSpeed Insights API if key is available
  const apiKey = process.env.GOOGLE_PSI_API_KEY;
  if (apiKey) {
    try {
      const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&key=${apiKey}&strategy=mobile&category=performance&category=accessibility`;
      const response = await fetch(psiUrl);
      const psi: PSIResponse = await response.json();

      if (psi.error) {
        return {
          url: normalizedUrl,
          score: null,
          performanceScore: null,
          accessibilityScore: null,
          mainProblem: "Audit API error",
          detailedNotes: psi.error.message,
          checkedAt,
          error: psi.error.message,
        };
      }

      const perf = psi.lighthouseResult?.categories?.performance?.score ?? null;
      const a11y = psi.lighthouseResult?.categories?.accessibility?.score ?? null;
      const { main, details } = extractProblem(psi);

      return {
        url: normalizedUrl,
        score: perf !== null ? Math.round(perf * 100) : null,
        performanceScore: perf !== null ? Math.round(perf * 100) : null,
        accessibilityScore: a11y !== null ? Math.round(a11y * 100) : null,
        mainProblem: main,
        detailedNotes: details,
        checkedAt,
      };
    } catch (err) {
      return {
        url: normalizedUrl,
        score: null,
        performanceScore: null,
        accessibilityScore: null,
        mainProblem: "Audit failed",
        detailedNotes: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        checkedAt,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // Fallback: basic HTTP check
  try {
    const startTime = Date.now();
    const response = await fetch(normalizedUrl, { method: "HEAD", redirect: "follow" });
    const loadTime = Date.now() - startTime;

    const problems: string[] = [];
    if (!response.ok) {
      problems.push(`HTTP ${response.status}: ${response.statusText}`);
    }
    if (loadTime > 3000) {
      problems.push(`Slow response (${loadTime}ms)`);
    }
    if (response.redirected) {
      problems.push("Multiple redirects detected");
    }

    return {
      url: normalizedUrl,
      score: null,
      performanceScore: null,
      accessibilityScore: null,
      mainProblem: problems.length > 0 ? problems.join("; ") : "Basic check passed",
      detailedNotes: [
        `Status: ${response.status} ${response.statusText}`,
        `Load time: ${loadTime}ms`,
        `Redirected: ${response.redirected}`,
        `Final URL: ${response.url}`,
      ].join("\n"),
      checkedAt,
    };
  } catch (err) {
    return {
      url: normalizedUrl,
      score: null,
      performanceScore: null,
      accessibilityScore: null,
      mainProblem: "Website unreachable",
      detailedNotes: `Could not reach ${normalizedUrl}: ${err instanceof Error ? err.message : "Unknown error"}`,
      checkedAt,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
