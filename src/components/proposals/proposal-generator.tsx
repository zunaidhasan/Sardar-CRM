"use client";

import * as React from "react";
import { Check, Copy, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { generateProposalAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TONES = ["professional", "friendly", "confident", "concise", "consultative"] as const;
const TONE_LABELS: Record<(typeof TONES)[number], string> = {
  professional: "Professional",
  friendly: "Friendly",
  confident: "Confident",
  concise: "Concise",
  consultative: "Consultative",
};

export function ProposalGenerator() {
  const [platform, setPlatform] = React.useState("upwork");
  const [tone, setTone] = React.useState<(typeof TONES)[number]>("professional");
  const [jobDescription, setJobDescription] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [projectName, setProjectName] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [timeline, setTimeline] = React.useState("");
  const [extraNotes, setExtraNotes] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [result, setResult] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  async function generate() {
    if (!jobDescription.trim()) {
      toast.error("Paste the job or gig description first");
      return;
    }
    setGenerating(true);
    const res = await generateProposalAction({
      platform,
      tone,
      jobDescription,
      clientName: clientName || undefined,
      projectName: projectName || undefined,
      budget: budget || undefined,
      timeline: timeline || undefined,
      extraNotes: extraNotes || undefined,
    });
    setGenerating(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.data) {
      setResult(res.data);
      toast.success("Proposal generated");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Proposal details
          </CardTitle>
          <CardDescription>
            Describe the gig/job and we&apos;ll craft a personalized cover letter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upwork">Upwork</SelectItem>
                  <SelectItem value="fiverr">Fiverr</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Project name</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. $500-800" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Timeline</Label>
              <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g. 2 weeks" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job">Job / gig description *</Label>
            <Textarea
              id="job"
              rows={7}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full Upwork job post or Fiverr buyer request here..."
            />
          </div>

          <div className="space-y-2">
            <Label>Extra notes</Label>
            <Textarea
              rows={2}
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Anything to emphasize, e.g. relevant experience, tech stack..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    tone === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {TONE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles />}
            {generating ? "Generating..." : "Generate proposal"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Generated proposal</CardTitle>
            <CardDescription>
              {result ? `${result.split(/\s+/).length} words · ready to paste` : "Your cover letter will appear here."}
            </CardDescription>
          </div>
          {result && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
                <RefreshCw /> Regenerate
              </Button>
              <Button size="sm" onClick={copy}>
                {copied ? <Check /> : <Copy />} Copy
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
              {result}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
              <Sparkles className="h-8 w-8" />
              <p className="max-w-xs text-sm">
                Fill in the details on the left and hit generate. Works with your own LLM key
                (USER_LLM_API_KEY) or a built-in smart template.
              </p>
            </div>
          )}
          {result && <Badge className="mt-3" variant="secondary">Tip: personalize the opening line before sending.</Badge>}
        </CardContent>
      </Card>
    </div>
  );
}
