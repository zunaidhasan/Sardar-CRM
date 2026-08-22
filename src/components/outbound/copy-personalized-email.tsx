"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Mail, Check, ChevronDown, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { renderTemplate } from "@/lib/template-render";
import { sendOutreachEmailAction } from "@/app/actions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Client, EmailTemplate } from "@/lib/types";

export function CopyPersonalizedEmail({
  lead,
  templates,
  userName,
}: {
  lead: Client;
  templates: EmailTemplate[];
  userName?: string | null;
}) {
  const [selectedTemplate, setSelectedTemplate] = React.useState<EmailTemplate | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [previewMode, setPreviewMode] = React.useState<"light" | "dark">("light");

  const renderedBody = selectedTemplate
    ? renderTemplate(selectedTemplate.body, lead, userName)
    : "";
  const renderedSubject = selectedTemplate?.subject
    ? renderTemplate(selectedTemplate.subject, lead, userName)
    : "";

  async function handleCopy() {
    const text = renderedSubject
      ? `Subject: ${renderedSubject}\n\n${renderedBody}`
      : renderedBody;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Personalized email copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!selectedTemplate || !lead.email) return;
    setSending(true);
    const result = await sendOutreachEmailAction(lead.id, selectedTemplate.id);
    setSending(false);
    if (result.ok) {
      toast.success(lead.email ? `Email sent to ${lead.email}` : "Email sent (demo mode)");
    } else {
      toast.error(result.error);
    }
  }

  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Mail className="h-3.5 w-3.5" />
              {selectedTemplate ? selectedTemplate.name : "Choose template"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px]">
            {templates.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t);
                  setShowPreview(true);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.category}</p>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedTemplate && (
          <>
            <Button size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
            {lead.email && (
              <Button size="sm" variant="default" onClick={handleSend} disabled={sending}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            )}
          </>
        )}
      </div>

      {showPreview && selectedTemplate && (
        <div className="space-y-2">
          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "light" | "dark")}>
            <TabsList className="h-7">
              <TabsTrigger value="light" className="text-xs px-2 h-5">Light</TabsTrigger>
              <TabsTrigger value="dark" className="text-xs px-2 h-5">Dark</TabsTrigger>
            </TabsList>
          </Tabs>
          <div
            className={cn(
              "rounded-lg border p-4 space-y-2",
              previewMode === "dark"
                ? "bg-gray-900 text-gray-100 border-gray-700"
                : "bg-white text-gray-900 border-gray-200",
            )}
          >
            {renderedSubject && (
              <p className="text-xs font-medium">
                <span className={previewMode === "dark" ? "text-gray-400" : "text-gray-500"}>Subject: </span>
                <span className="font-semibold">{renderedSubject}</span>
              </p>
            )}
            <div
              className={cn(
                "whitespace-pre-wrap text-sm leading-relaxed",
                previewMode === "dark" ? "text-gray-200" : "text-gray-800",
              )}
            >
              {renderedBody}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
