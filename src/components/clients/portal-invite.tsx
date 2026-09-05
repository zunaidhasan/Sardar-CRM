"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Link2, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClientPortalAction, revokeClientPortalAction } from "@/app/actions";
import type { ClientPortal } from "@/lib/types";

export function PortalInvite({
  clientId,
  projectId,
  portals,
}: {
  clientId: string;
  projectId?: string | null;
  portals: ClientPortal[];
}) {
  const [busy, setBusy] = React.useState(false);
  const active = portals.filter((p) => p.is_active);

  async function createLink() {
    setBusy(true);
    const result = await createClientPortalAction({ client_id: clientId, project_id: projectId });
    setBusy(false);
    if (!result.ok || !result.data) {
      toast.error(result.ok ? "Failed" : result.error);
      return;
    }
    const abs = `${window.location.origin}${result.data.url}`;
    await navigator.clipboard.writeText(abs);
    toast.success("Portal link copied");
  }

  async function copy(token: string) {
    const abs = `${window.location.origin}/portal/${token}`;
    await navigator.clipboard.writeText(abs);
    toast.success("Copied");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Client portal</CardTitle>
        <Button size="sm" onClick={createLink} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          New magic link
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a password-free link so the client can view milestones and sign off.
          </p>
        ) : (
          active.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <code className="truncate text-xs">/portal/{p.token.slice(0, 10)}...</code>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => copy(p.token)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    const r = await revokeClientPortalAction(p.id, clientId);
                    if (r.ok) toast.success("Revoked");
                    else toast.error(r.error);
                  }}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
