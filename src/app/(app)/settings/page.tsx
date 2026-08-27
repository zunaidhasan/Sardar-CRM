import type { Metadata } from "next";
import { requireUser, fetchAccounts, fetchUsers, fetchProjects, fetchOpportunities, fetchInvoices, fetchClients, fetchTeamMembers } from "@/lib/data";
import { isDemoMode } from "@/lib/utils";
import { listApiKeys } from "@/lib/api-keys";
import { PageHeader } from "@/components/page-header";
import { AccountManager } from "@/components/settings/account-manager";
import { ProfileEditor } from "@/components/settings/profile-editor";
import { TeamAccessManager } from "@/components/settings/team-access-manager";
import { ResetDemoButton } from "@/components/settings/reset-demo-button";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { ExternalIntegrations } from "@/components/settings/external-integrations";
import { NotificationWebhooks } from "@/components/settings/notification-webhooks";
import { DataExport } from "@/components/settings/data-export";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const [accounts, users, demo, apiKeys, projects, opportunities, invoices, clients, teamMembers] = await Promise.all([
    fetchAccounts(user.id),
    (user.realRole ?? user.role) === "ceo" ? fetchUsers() : Promise.resolve([]),
    Promise.resolve(isDemoMode()),
    listApiKeys(user.id),
    fetchProjects(user.id),
    fetchOpportunities(user.id),
    fetchInvoices(user.id),
    fetchClients(user.id),
    fetchTeamMembers(user.id),
  ]);

  const llmConfigured =
    process.env.USER_LLM_API_KEY && process.env.USER_LLM_BASE_URL && process.env.USER_LLM_MODEL;

  return (
    <div>
      <PageHeader title="Settings" description="Profile, seller accounts and workspace configuration." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-6">
          <ProfileEditor profile={user.profile} email={user.email} />

          <AccountManager accounts={accounts} />

          {(user.realRole ?? user.role) === "ceo" && <TeamAccessManager users={users} />}

          <ApiKeysManager keys={apiKeys} isDemo={demo} />
        </section>

        <section className="space-y-6">
          <ExternalIntegrations
            integrations={[
              { name: "Apollo", configured: Boolean(process.env.APOLLO_API_KEY), envVar: "APOLLO_API_KEY" },
              { name: "Hunter", configured: Boolean(process.env.HUNTER_API_KEY), envVar: "HUNTER_API_KEY" },
            ]}
            isDemo={demo}
          />

          <NotificationWebhooks webhooks={[]} isDemo={demo} />

          <DataExport
            clients={clients}
            opportunities={opportunities}
            projects={projects}
            invoices={invoices}
            teamMembers={teamMembers}
            currency={user.profile?.currency ?? "USD"}
          />

          <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="text-base font-semibold">AI Proposal Generator</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              When you set <code className="rounded bg-muted px-1.5 py-0.5 text-xs">USER_LLM_API_KEY</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">USER_LLM_BASE_URL</code> and{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">USER_LLM_MODEL</code> in your
              environment, the generator uses your LLM. Otherwise it falls back to a smart,
              tone-aware template so the feature always works.
            </p>
            <p className="mt-3 text-sm">
              Status:{" "}
              {llmConfigured ? (
                <span className="font-medium text-emerald-600">LLM connected</span>
              ) : (
                <span className="font-medium text-amber-600">Template mode</span>
              )}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm">
            <h2 className="text-base font-semibold">Workspace</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {demo
                ? "You're in demo mode. Data is stored locally and anyone can explore the app. Reset restores the original sample data."
                : "You're connected to Supabase. All data is private to your account via row-level security."}
            </p>
            {demo && (
              <ResetDemoButton />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
