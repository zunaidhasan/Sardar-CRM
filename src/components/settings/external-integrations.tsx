"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  Mail,
  Plug,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { testEnrichmentAction, testWebhookAction } from "@/app/actions";

// ---------------------------------------------------------------------------
// External Integrations Manager
//
// Lets users configure and test connections to external tools:
//   - Apollo.io  (lead enrichment by email)
//   - Hunter.io  (lead enrichment by domain)
//   - Custom webhook endpoint
// ---------------------------------------------------------------------------

interface IntegrationStatus {
  name: string;
  configured: boolean;
  envVar: string;
}

interface ExternalIntegrationsProps {
  integrations: IntegrationStatus[];
  isDemo: boolean;
  webhookUrl?: string;
}

export function ExternalIntegrations({
  integrations,
  isDemo,
  webhookUrl,
}: ExternalIntegrationsProps) {
  const [testing, setTesting] = React.useState<string | null>(null);
  const [testResults, setTestResults] = React.useState<Record<string, { ok: boolean; message: string }>>({});
  const [customUrl, setCustomUrl] = React.useState(webhookUrl ?? "");

  async function handleTestIntegration(name: string) {
    setTesting(name);
    setTestResults((prev) => ({ ...prev, [name]: { ok: false, message: "Testing..." } }));

    const result = await testEnrichmentAction(name);
    setTesting(null);
    setTestResults((prev) => ({
      ...prev,
      [name]: {
        ok: result.ok,
        message: result.ok ? "Connection successful!" : result.error,
      },
    }));
  }

  async function handleTestWebhook() {
    if (!customUrl.trim()) {
      toast.error("Enter a webhook URL first");
      return;
    }
    setTesting("webhook");
    const result = await testWebhookAction(customUrl.trim());
    setTesting(null);
    if (result.ok) {
      toast.success("Webhook endpoint is reachable");
    } else {
      toast.error(result.error);
    }
  }

  const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
    Apollo: <Globe className="h-5 w-5 text-blue-500" />,
    Hunter: <Mail className="h-5 w-5 text-orange-500" />,
    Custom: <Zap className="h-5 w-5 text-violet-500" />,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">External Integrations</CardTitle>
        </div>
        <CardDescription>
          Connect external tools for lead enrichment and data sync. API keys are
          stored securely and never exposed to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            External integrations require live mode (Supabase connected). Configure
            API keys in your <code>.env</code> file or via the Settings page.
          </div>
        )}

        {/* Integration cards */}
        <div className="space-y-3">
          {integrations.map((integration) => {
            const testResult = testResults[integration.name];
            return (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  {INTEGRATION_ICONS[integration.name] ?? (
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{integration.name}</p>
                      <Badge
                        variant={integration.configured ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {integration.configured ? "Connected" : "Not configured"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {integration.name === "Apollo"
                        ? "People match API — enrich leads by email"
                        : integration.name === "Hunter"
                          ? "Domain search API — enrich leads by website domain"
                          : "Webhook endpoint for external data sync"}
                    </p>
                    {testResult && (
                      <p className={`mt-1 text-xs ${testResult.ok ? "text-emerald-600" : "text-rose-600"}`}>
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestIntegration(integration.name)}
                  disabled={testing !== null || isDemo}
                >
                  {testing === integration.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Test
                </Button>
              </div>
            );
          })}
        </div>

        {/* Custom webhook */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-500" />
            <p className="text-sm font-medium">Custom Webhook</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Receive events from Zapier, n8n, Make, or custom scripts.
            POST JSON with <code className="rounded bg-muted px-1 py-0.5">event</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">data</code>, and{" "}
            <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer sb_live_...</code>
          </p>
          <div className="flex gap-2">
            <Input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://your-app.com/api/webhooks"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestWebhook}
              disabled={testing === "webhook" || isDemo}
            >
              {testing === "webhook" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Test
            </Button>
          </div>
        </div>

        {/* Setup instructions */}
        <div className="rounded-lg bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground/80">How to configure</p>
          <p>
            Set the following environment variables in your{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env</code> file:
          </p>
          <div className="space-y-1 font-mono text-[11px]">
            <p>APOLLO_API_KEY=your_apollo_key</p>
            <p>HUNTER_API_KEY=your_hunter_key</p>
            <p>WEBHOOK_SECRET=your_webhook_secret</p>
          </div>
          <p>
            Or use the API Keys section above to create programmatic access keys
            that external tools can use to push data into your CRM.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
