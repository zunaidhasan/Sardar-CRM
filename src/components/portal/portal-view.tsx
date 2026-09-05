"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLogo } from "@/components/layout/app-logo";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate, countdownLabel } from "@/lib/utils";
import { signPortalAction } from "@/app/actions";
import type { Client, Milestone, PortalSignature, Project } from "@/lib/types";

interface PortalViewProps {
  token: string;
  client: Client;
  project: Project | null;
  milestones: Milestone[];
  signatures: PortalSignature[];
  currency: string;
}

export function PortalView({
  token,
  client,
  project,
  milestones,
  signatures,
  currency,
}: PortalViewProps) {
  const [name, setName] = React.useState(client.name);
  const [drawing, setDrawing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const last = React.useRef<{ x: number; y: number } | null>(null);

  const done = milestones.filter((m) => m.status === "done").length;
  const progress = milestones.length ? Math.round((done / milestones.length) * 100) : project?.progress ?? 0;
  const cd = countdownLabel(project?.delivery_deadline);
  const signed = signatures.length > 0;

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    setDrawing(true);
    last.current = pos(e);
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current || !last.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }
  function pointerUp() {
    setDrawing(false);
    last.current = null;
  }

  async function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !name.trim()) {
      toast.error("Enter your name and sign below");
      return;
    }
    setBusy(true);
    const result = await signPortalAction({
      token,
      signerName: name.trim(),
      signatureData: canvas.toDataURL("image/png"),
    });
    setBusy(false);
    if (result.ok) toast.success("Signed. Thank you.");
    else toast.error(result.error);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <AppLogo size="sm" />
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Client portal</p>
          <h1 className="text-xl font-semibold">{client.name}</h1>
        </div>
      </div>

      {project && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{project.project_name}</h2>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(project.gross_amount, currency)}
                {project.delivery_deadline ? ` · ${formatDate(project.delivery_deadline)}` : ""}
              </p>
            </div>
            <span className={cd.urgent ? "text-sm font-medium text-rose-500" : "text-sm text-muted-foreground"}>
              {cd.label}
            </span>
          </div>
          <Progress value={progress} className="mt-4" />
          <p className="mt-2 text-xs text-muted-foreground">{progress}% complete</p>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Milestones</h3>
        <ul className="space-y-2">
          {milestones.length === 0 && (
            <li className="text-sm text-muted-foreground">No milestones published yet.</li>
          )}
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              {m.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={m.status === "done" ? "text-muted-foreground line-through" : ""}>{m.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold">Approval signature</h3>
        {signed ? (
          <p className="text-sm text-emerald-600">
            Signed by {signatures[0]!.signer_name} on {formatDate(signatures[0]!.signed_at)}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sign below to approve the current scope.</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            <canvas
              ref={canvasRef}
              width={640}
              height={180}
              className="w-full touch-none rounded-md border bg-white"
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerLeave={pointerUp}
            />
            <Button onClick={submit} disabled={busy}>
              Approve &amp; sign
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
