"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  Mail,
  Paperclip,
  Pencil,
  Send,
} from "lucide-react";
import { ClientDialog } from "@/components/clients/client-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { PlatformBadge, ProjectStatusBadge } from "@/components/status-badges";
import { ACTIVITY_TYPE_LABELS, STAGE_META, LEAD_SCORE_META, OUTREACH_STATUS_META, FOLLOW_UP_SCHEDULE } from "@/lib/constants";
import { cn, formatCurrency, formatDate, initials, timeAgo } from "@/lib/utils";
import { logActivityAction, registerAttachmentAction } from "@/app/actions";
import type {
  Activity,
  Attachment,
  Client,
  ClientPortal,
  FollowUp,
  Opportunity,
  Project,
} from "@/lib/types";

export interface ClientProfileData extends Client {
  opportunities: Opportunity[];
  projects: Project[];
  activities: Activity[];
  follow_ups: FollowUp[];
  attachments: Attachment[];
  portals: ClientPortal[];
}

import { PortalInvite } from "@/components/clients/portal-invite";
import { CopyPersonalizedEmail } from "@/components/outbound/copy-personalized-email";
import { LeadScoreBreakdown } from "@/components/outbound/lead-score-breakdown";
import { AuditLogPanel } from "@/components/outbound/audit-log-panel";
import { AIReplyAssistant } from "@/components/outbound/ai-reply-assistant";
import { getAuditLog } from "@/lib/audit-log";
import type { EmailTemplate } from "@/lib/types";

export function ClientProfile({
  client,
  currency,
  userName,
  avatarUrl,
  templates = [],
}: {
  client: ClientProfileData;
  currency: string;
  userName?: string | null;
  avatarUrl?: string | null;
  templates?: EmailTemplate[];
}) {
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const isOutbound = Boolean(client.outreach_status || client.lead_score || client.source);
  const nextFollowUp = client.next_follow_up_date;
  const isOverdue = nextFollowUp && new Date(nextFollowUp) < new Date();

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    const result = await logActivityAction({
      entityType: "client",
      entityId: client.id,
      activityType: "note",
      subject: "Note added",
      body: note.trim(),
    });
    setSavingNote(false);
    if (result.ok) {
      setNote("");
      toast.success("Note added");
    } else {
      toast.error(result.error);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabase();
      let filePath: string;
      if (supabase) {
        filePath = `${client.user_id}/client/${client.id}/${crypto.randomUUID()}/${file.name}`;
        const { error } = await supabase.storage
          .from("attachments")
          .upload(filePath, file, { upsert: false });
        if (error) throw error;
      } else {
        filePath = `demo/client/${client.id}/${file.name}`;
      }
      const result = await registerAttachmentAction({
        entityType: "client",
        entityId: client.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("File attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/clients">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-lg text-primary">{initials(client.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
              {client.platform && <PlatformBadge platform={client.platform} />}
            </div>
            <p className="text-sm text-muted-foreground">
              {[client.company, client.category].filter(Boolean).join(" · ") || "No details"}
            </p>
          </div>
        </div>
        <Button variant="outline" className="ml-auto" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <MiniStat label="Deals" value={client.opportunities.length} />
        <MiniStat label="Projects" value={client.projects.length} />
        <MiniStat label="Follow-ups" value={client.follow_ups.length} />
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {isOutbound && <TabsTrigger value="outreach">Outreach</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="deals">Deals ({client.opportunities.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({client.projects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Contact info</CardTitle>
                <AIReplyAssistant
                  originalMessage={
                    client.notes && client.notes.trim()
                      ? client.notes
                      : `Hi ${client.name},\n\nWe are following up on the project conversation about ${client.company ?? "your project"}.`
                  }
                  clientName={client.name}
                  projectName={client.projects[0]?.project_name ?? client.company ?? "your project"}
                  context={
                    client.opportunities.length > 0
                      ? `Recent deal: ${client.opportunities[0]?.title ?? ""}. ${client.opportunities[0]?.notes ?? ""}`
                      : "Client relationship context includes agency communications and prior project notes."
                  }
                  trigger={
                    <Button variant="outline" size="sm">
                      <Send className="mr-1 h-3.5 w-3.5" />
                      AI Draft Reply
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow icon={Mail} label="Email" value={client.email ?? "—"} />
                <InfoRow icon={Building2} label="Company" value={client.company ?? "—"} />
                <InfoRow icon={Globe} label="Username" value={client.username ?? "—"} />
                <InfoRow icon={Globe} label="Profile URL" value={client.profile_url ?? "—"} />
                <InfoRow icon={Calendar} label="Created" value={formatDate(client.created_at)} />
                {client.notes && (
                  <div className="rounded-lg bg-muted/60 p-3 text-sm">{client.notes}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Attachments</CardTitle>
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
                  <Button asChild variant="outline" size="sm">
                    <span>
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip />}
                      Upload
                    </span>
                  </Button>
                </label>
              </CardHeader>
              <CardContent>
                {client.attachments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No files attached yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {client.attachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-lg border p-2.5 text-sm"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{a.file_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(a.file_size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <PortalInvite
                clientId={client.id}
                projectId={client.projects[0]?.id ?? null}
                portals={client.portals ?? []}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={submitNote} className="mb-6 flex flex-col gap-2">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Log an email, call, follow-up or note..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={savingNote || !note.trim()}>
                    {savingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Send /> Add to history
                  </Button>
                </div>
              </form>

              {client.activities.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <div className="space-y-1">
                  {client.activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent/50">
                      {/* RLS scopes the history to the viewer's own activities,
                          so the signed-in user's avatar is the correct face. */}
                      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                        {avatarUrl && (
                          <AvatarImage src={avatarUrl} alt={userName ?? "User"} />
                        )}
                        <AvatarFallback className="text-[10px]">
                          {initials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <Badge variant="outline" className="mt-0.5 shrink-0">
                        {ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{a.subject}</p>
                        {a.body && <p className="text-sm text-muted-foreground">{a.body}</p>}
                      </div>
                      <span suppressHydrationWarning className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(a.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isOutbound && (
          <TabsContent value="outreach">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Lead Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <LeadScoreBreakdown lead={client} />
                  <InfoRow icon={Globe} label="Country" value={client.country ?? "—"} />
                  <InfoRow icon={Building2} label="Industry" value={client.industry ?? "—"} />
                  {client.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="w-28 shrink-0 text-muted-foreground">Website</span>
                      <a href={client.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        {client.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {client.linkedin_url && (
                    <div className="flex items-center gap-3">
                      <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="w-28 shrink-0 text-muted-foreground">LinkedIn</span>
                      <a href={client.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <InfoRow icon={Mail} label="Source" value={client.source ?? "—"} />
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="w-28 shrink-0 text-muted-foreground">Email Verified</span>
                    <Badge variant="outline" className={cn("border", client.email_verified ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                      {client.email_verified ? "Yes" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Website Review Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Website Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Main Problem Found</p>
                    <p className="rounded-lg bg-muted/60 p-3">{client.main_problem_found || "No notes yet."}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Detailed Review Notes</p>
                    <p className="rounded-lg bg-muted/60 p-3 whitespace-pre-wrap">{client.website_review_notes || "No detailed notes yet."}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Copy Personalized Email */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personalized Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <CopyPersonalizedEmail
                    lead={client}
                    templates={templates}
                    userName={userName}
                  />
                </CardContent>
              </Card>

              {/* Outreach Timeline */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Outreach Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Outreach Status</p>
                      <Badge variant="outline" className={cn("mt-1 border", OUTREACH_STATUS_META[client.outreach_status].badge)}>
                        {client.outreach_status}
                      </Badge>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Last Email Sent</p>
                      <p className="mt-1 text-sm font-medium">
                        {client.last_email_sent_at ? formatDate(client.last_email_sent_at) : "Never"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Follow-up Count</p>
                      <p className="mt-1 text-sm font-medium">{client.follow_up_count ?? 0}</p>
                    </div>
                    <div className={cn("rounded-lg border p-3", isOverdue && "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950")}>
                      <p className="text-xs text-muted-foreground">Next Follow-up</p>
                      <p className={cn("mt-1 text-sm font-medium", isOverdue && "text-rose-600")}>
                        {nextFollowUp ? formatDate(nextFollowUp) : "Not set"}
                      </p>
                      {isOverdue && <p className="mt-0.5 text-[10px] font-medium text-rose-500">Overdue</p>}
                    </div>
                  </div>
                  {client.follow_up_count && client.follow_up_count > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Follow-up Sequence</p>
                      <div className="flex items-center gap-2">
                        {FOLLOW_UP_SCHEDULE.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium",
                                (client.follow_up_count ?? 0) > i
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                  : (client.follow_up_count ?? 0) === i
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-muted bg-muted text-muted-foreground",
                              )}
                            >
                              {i + 1}
                            </div>
                            {i < FOLLOW_UP_SCHEDULE.length - 1 && (
                              <div className={cn("h-px w-6", (client.follow_up_count ?? 0) > i ? "bg-emerald-300" : "bg-muted")} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audit Log */}
              <Card className="lg:col-span-2">
                <CardContent className="pt-6">
                  <AuditLogPanel entries={getAuditLog(client.id)} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="deals">
          {client.opportunities.length === 0 ? (
            <EmptyState title="No deals" description="This client has no deals yet." />
          ) : (
            <div className="space-y-2">
              {client.opportunities.map((o) => (
                <Link
                  key={o.id}
                  href="/pipeline"
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground">{STAGE_META[o.stage].label}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-primary">
                    {formatCurrency(o.amount, o.currency)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects">
          {client.projects.length === 0 ? (
            <EmptyState title="No projects" description="This client has no projects yet." />
          ) : (
            <div className="space-y-2">
              {client.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.project_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.order_date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ProjectStatusBadge status={p.status} />
                    <span className="font-semibold">{formatCurrency(p.net_amount, currency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientDialog
        open={editing}
        onOpenChange={setEditing}
        client={client}
        onSaved={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 flex-1 truncate", value === "—" && "text-muted-foreground")}>{value}</span>
    </div>
  );
}
