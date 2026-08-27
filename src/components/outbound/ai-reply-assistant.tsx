"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/components/i18n-provider";
import { generateReplySuggestions, type ReplySuggestion } from "@/lib/ai-reply-assistant";

interface AIReplyAssistantProps {
  originalMessage: string;
  clientName?: string;
  projectName?: string;
  context?: string;
  onSelectReply?: (reply: string) => void;
  trigger?: React.ReactNode;
}

const TONE_COLORS: Record<string, string> = {
  professional: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  friendly: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  formal: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  casual: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function AIReplyAssistant({
  originalMessage,
  clientName,
  projectName,
  context,
  onSelectReply,
  trigger,
}: AIReplyAssistantProps) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<ReplySuggestion[]>([]);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const results = await generateReplySuggestions({
        originalMessage,
        clientName,
        projectName,
        context,
      });
      setSuggestions(results);
    } catch (e) {
      toast.error("Failed to generate reply suggestions");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [open]);

  async function handleCopy(suggestion: ReplySuggestion) {
    try {
      await navigator.clipboard.writeText(suggestion.body);
      setCopiedId(suggestion.id);
      toast.success("Reply copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  function handleUse(suggestion: ReplySuggestion) {
    onSelectReply?.(suggestion.body);
    setOpen(false);
    toast.success("Reply applied to compose field");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI Reply
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Reply Assistant
          </DialogTitle>
        </DialogHeader>

        {/* Original message preview */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Original message:</p>
          <p className="text-sm line-clamp-3">{originalMessage}</p>
        </div>

        <Separator />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Generating reply suggestions...
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No suggestions generated. Try again.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchSuggestions}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`${TONE_COLORS[s.tone] ?? ""} border-0 text-[10px]`}>
                    {s.label}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => handleCopy(s)}
                    >
                      {copiedId === s.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="h-7"
                      onClick={() => handleUse(s)}
                    >
                      Use this
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={fetchSuggestions}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Generate new suggestions
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
