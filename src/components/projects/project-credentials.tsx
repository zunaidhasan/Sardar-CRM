"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addProjectCredentialAction,
  deleteProjectCredentialAction,
  revealProjectCredentialPasswordAction,
} from "@/app/actions";
import type { ProjectCredentialView } from "@/lib/types";

const MASK = "••••••••";

export function ProjectCredentials({
  projectId,
  credentials,
}: {
  projectId: string;
  credentials: ProjectCredentialView[];
}) {
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    url: "",
    username: "",
    password: "",
    notes: "",
  });
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = React.useState<Record<string, string>>({});

  async function handleReveal(c: ProjectCredentialView) {
    const show = revealed[c.id] ?? false;
    if (!show && passwords[c.id] === undefined) {
      const result = await revealProjectCredentialPasswordAction(projectId, c.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.data) {
        toast.error("Could not load password");
        return;
      }
      const pw: string = result.data;
      setPasswords((p) => ({ ...p, [c.id]: pw }));
    }
    setRevealed((r) => ({ ...r, [c.id]: !show }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const result = await addProjectCredentialAction(projectId, {
      title: form.title.trim(),
      url: form.url.trim() || null,
      username: form.username.trim() || null,
      password: form.password || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (result.ok) {
      setForm({ title: "", url: "", username: "", password: "", notes: "" });
      setAdding(false);
      toast.success("Login saved");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(c: ProjectCredentialView) {
    if (!window.confirm(`Delete "${c.title}"?`)) return;
    const result = await deleteProjectCredentialAction(projectId, c.id);
    if (!result.ok) toast.error(result.error);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-muted-foreground" /> Logins & access
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Client logins, hosting & API keys — passwords stay hidden until revealed
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && (
          <form onSubmit={handleAdd} className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title, e.g. 'WordPress admin'"
              autoFocus
            />
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="URL (https://…)"
            />
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="Username"
            />
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Password"
            />
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving || !form.title.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Save login
              </Button>
            </div>
          </form>
        )}

        {credentials.length === 0 && !adding && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No logins saved yet — add the client&apos;s WP admin, cPanel, FTP…
          </p>
        )}

        {credentials.map((c) => {
          const show = revealed[c.id] ?? false;
          const password = passwords[c.id] ?? "";
          return (
            <div key={c.id} className="group rounded-lg border p-3 transition-colors hover:bg-accent/40">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{c.title}</p>
                <div className="flex items-center gap-1">
                  {c.has_password && (
                    <button
                      onClick={() => handleReveal(c)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={show ? "Hide password" : "Reveal password"}
                      title={show ? "Hide password" : "Reveal password"}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete login"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1.5 space-y-1 text-xs">
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block max-w-full truncate text-primary hover:underline"
                  >
                    {c.url}
                  </a>
                )}
                {c.username && (
                  <p className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{c.username}</span>
                    <button
                      onClick={() => copy(c.username!, "Username")}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Copy username"
                      title="Copy username"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </p>
                )}
                {c.has_password && (
                  <p className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {show && password ? password : MASK}
                    </span>
                    <button
                      onClick={() => copy(password, "Password")}
                      disabled={!show || !password}
                      className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                      aria-label="Copy password"
                      title="Copy password (reveal it first)"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </p>
                )}
                {c.notes && <p className="text-muted-foreground">{c.notes}</p>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
