"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { createApiKeyAction, revokeApiKeyAction, listApiKeysAction } from "@/app/actions";
import type { ApiKeyRow } from "@/lib/types";

interface ApiKeysManagerProps {
  keys: ApiKeyRow[];
  isDemo: boolean;
}

export function ApiKeysManager({ keys, isDemo }: ApiKeysManagerProps) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [newKeyScopes, setNewKeyScopes] = React.useState<string[]>(["read", "write"]);
  const [saving, setSaving] = React.useState(false);
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null);

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error("Key name is required");
      return;
    }
    setSaving(true);
    const result = await createApiKeyAction(newKeyName.trim(), newKeyScopes);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.data) {
      setRevealedKey(result.data.rawKey);
      setCreateOpen(false);
      setNewKeyName("");
      setNewKeyScopes(["read", "write"]);
      toast.success("API key created — copy it now, it won't be shown again!");
    }
  }

  async function handleRevoke(keyId: string, keyName: string) {
    if (!window.confirm(`Revoke API key "${keyName}"? This cannot be undone.`)) return;
    const result = await revokeApiKeyAction(keyId);
    if (result.ok) {
      toast.success("API key revoked");
    } else {
      toast.error(result.error);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">API Keys</CardTitle>
          </div>
          <CardDescription>
            Manage API keys for external integrations (Apollo, Hunter, Zapier, n8n, etc.).
            Keys grant programmatic access to your CRM data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDemo && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              API keys are only available in live mode (Supabase connected).
            </div>
          )}

          {keys.length === 0 && !isDemo ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Key className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No API keys yet. Create one to get started with integrations.
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{key.name}</p>
                      <Badge variant={key.is_active ? "default" : "secondary"} className="text-[10px]">
                        {key.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                        {key.key_prefix}
                      </code>
                      <span>Scopes: {key.scopes.join(", ")}</span>
                      {key.last_used_at && (
                        <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {key.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRevoke(key.id, key.name)}
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isDemo && (
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create API key
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Created key reveal dialog */}
      <Dialog open={!!revealedKey} onOpenChange={() => setRevealedKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-emerald-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy this key now — it will <strong>not</strong> be shown again for security reasons.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <code className="flex-1 break-all font-mono text-xs">{revealedKey}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => copyKey(revealedKey!)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this as: <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer {revealedKey?.slice(0, 12)}...</code>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)}>I&apos;ve copied it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create key dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Generate a new key for external tool integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key name *</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Apollo Integration, Zapier, n8n"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex gap-4">
                {[
                  { id: "read", label: "Read (GET)" },
                  { id: "write", label: "Write (POST)" },
                  { id: "admin", label: "Admin" },
                ].map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={newKeyScopes.includes(scope.id)}
                      onCheckedChange={(checked) => {
                        setNewKeyScopes((prev) =>
                          checked
                            ? [...prev, scope.id]
                            : prev.filter((s) => s !== scope.id)
                        );
                      }}
                    />
                    {scope.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !newKeyName.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
