"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Globe,
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
import { ACTIVITY_TYPE_LABELS, STAGE_META } from "@/lib/constants";
import { cn, formatCurrency, formatDate, initials, timeAgo } from "@/lib/utils";
import { logActivityAction, registerAttachmentAction } from "@/app/actions";
import type {
  Activity,
  Attachment,
  Client,
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
}

export function ClientProfile({
  client,
  currency,
  userName,
  avatarUrl,
}: {
  client: ClientProfileData;
  currency: string;
  userName?: string | null;
  avatarUrl?: string | null;
}) {
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

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
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="deals">Deals ({client.opportunities.length})</TabsTrigger>
          <TabsTrigger value="projects">Projects ({client.projects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact info</CardTitle>
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
