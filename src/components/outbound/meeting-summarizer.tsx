"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  Brain,
  Plus,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { summarizeMeeting, type MeetingSummary, type ActionItem } from "@/lib/ai-meeting-summarizer";
import { addProjectTodoAction } from "@/app/actions";
import { useI18n } from "@/components/i18n-provider";

interface MeetingSummarizerProps {
  projectId?: string;
  projectName?: string;
  clientName?: string;
  trigger?: React.ReactNode;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function MeetingSummarizer({
  projectId,
  projectName,
  clientName,
  trigger,
}: MeetingSummarizerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [summary, setSummary] = React.useState<MeetingSummary | null>(null);
  const [addingTodoId, setAddingTodoId] = React.useState<string | null>(null);
  const [meetingDate, setMeetingDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );

  async function handleSummarize() {
    if (!transcript.trim()) {
      toast.error("Please paste a meeting transcript");
      return;
    }
    setLoading(true);
    try {
      const result = await summarizeMeeting({
        transcript: transcript.trim(),
        projectName,
        clientName,
        meetingDate,
      });
      setSummary(result);
    } catch (e) {
      toast.error("Failed to summarize meeting");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddActionAsTodo(action: ActionItem) {
    if (!projectId) {
      toast.info("Open a project to add action items as todos");
      return;
    }
    setAddingTodoId(action.id);
    try {
      await addProjectTodoAction(projectId, {
        title: action.title,
        due_date: action.dueDate,
        assignee: action.assignee,
      });
      toast.success("Action item added as project todo!");
      router.refresh();
    } catch (e) {
      toast.error("Failed to add todo");
    } finally {
      setAddingTodoId(null);
    }
  }

  function handleReset() {
    setTranscript("");
    setSummary(null);
    setMeetingDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) handleReset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Meeting Summarizer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            AI Meeting Summarizer
          </DialogTitle>
        </DialogHeader>

        {!summary ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste a meeting transcript or notes below. The AI will extract a summary,
              action items, and key decisions.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Meeting Date</Label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              {projectName && (
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Input value={projectName} disabled />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Transcript / Notes *</Label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={"Paste your meeting transcript here...\n\nExample:\nJohn: Let's review the project timeline...\nSarah: I think we need to prioritize the payment integration...\nJohn: Agreed, let's aim to have it done by Friday."}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSummarize} disabled={loading || !transcript.trim()}>
                {loading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-1 h-4 w-4" />
                )}
                Summarize Meeting
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{summary.summary}</p>
              </CardContent>
            </Card>

            {/* Participants */}
            {summary.participants.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({summary.participants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {summary.participants.map((p) => (
                      <Badge key={p} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Decisions */}
            {summary.keyDecisions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Key Decisions ({summary.keyDecisions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.keyDecisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {summary.actionItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Action Items ({summary.actionItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.actionItems.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-3 rounded-lg border p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{action.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {action.assignee && (
                              <Badge variant="outline" className="text-[10px]">
                                {action.assignee}
                              </Badge>
                            )}
                            {action.dueDate && (
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="mr-1 h-2.5 w-2.5" />
                                {action.dueDate}
                              </Badge>
                            )}
                            <Badge className={`${PRIORITY_COLORS[action.priority]} border-0 text-[10px]`}>
                              {action.priority}
                            </Badge>
                          </div>
                        </div>
                        {projectId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0"
                            onClick={() => handleAddActionAsTodo(action)}
                            disabled={addingTodoId === action.id}
                          >
                            {addingTodoId === action.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add to project
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Summarize another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
