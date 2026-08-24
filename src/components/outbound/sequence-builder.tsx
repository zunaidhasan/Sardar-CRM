"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  GripVertical,
  Plus,
  Trash2,
  Play,
  Pause,
  Clock,
  Mail,
  ArrowDown,
  Save,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type EmailSequence,
  type SequenceStep,
  createSequence,
  getSequences,
  updateSequence,
  deleteSequence,
  enrollLead,
  getSequenceEnrollments,
} from "@/lib/email-sequence";

// ---------------------------------------------------------------------------
// Sequence Builder
//
// Visual drag-and-drop email sequence designer. Users can:
// - Create new sequences with multiple steps
// - Reorder steps by dragging
// - Set delay between steps
// - Edit email content for each step
// - Activate/deactivate sequences
// - Enroll leads in sequences
// ---------------------------------------------------------------------------

function StepCard({
  step,
  index,
  totalSteps,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  step: SequenceStep;
  index: number;
  totalSteps: number;
  onUpdate: (patch: Partial<SequenceStep>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="relative rounded-lg border bg-card p-4 shadow-sm">
      {/* Step number & drag handle */}
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {index + 1}
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {/* Delay */}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Wait</Label>
            <Input
              type="number"
              min="0"
              max="30"
              value={step.delayDays}
              onChange={(e) => onUpdate({ delayDays: parseInt(e.target.value) || 0 })}
              className="h-7 w-16 text-xs"
            />
            <Label className="text-xs text-muted-foreground">days</Label>
            {index === 0 && (
              <Badge variant="outline" className="text-[10px]">Initial email</Badge>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Input
              value={step.subject}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              placeholder="Email subject line..."
              className="h-8 text-sm"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <Label className="text-xs">Body</Label>
            <Textarea
              value={step.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              placeholder="Email body. Use {{first_name}}, {{company}}, {{main_problem}} for personalization."
              rows={4}
              className="text-sm"
            />
          </div>

          {/* Available variables */}
          <div className="flex flex-wrap gap-1">
            {["{{first_name}}", "{{company}}", "{{website}}", "{{main_problem}}", "{{country}}"].map((v) => (
              <button
                key={v}
                onClick={() => {
                  navigator.clipboard.writeText(v);
                  toast.success(`Copied ${v}`);
                }}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={index === 0} className="h-6 w-6 p-0">
            ↑
          </Button>
          <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={index === totalSteps - 1} className="h-6 w-6 p-0">
            ↓
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SequenceBuilder() {
  const [sequences, setSequences] = React.useState<EmailSequence[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [editingDesc, setEditingDesc] = React.useState("");
  const [editingSteps, setEditingSteps] = React.useState<SequenceStep[]>([]);
  const [showNew, setShowNew] = React.useState(false);

  // Load sequences on mount (async — Supabase or demo store)
  React.useEffect(() => {
    getSequences().then(setSequences);
  }, []);

  /** Reload sequences from the store. */
  async function reloadSequences() {
    const updated = await getSequences();
    setSequences(updated);
  }

  const selected = sequences.find((s) => s.id === selectedId);

  const handleSelect = (id: string) => {
    const seq = sequences.find((s) => s.id === id);
    if (!seq) return;
    setSelectedId(id);
    setEditingName(seq.name);
    setEditingDesc(seq.description);
    setEditingSteps([...seq.steps]);
    setShowNew(false);
  };

  const handleNew = () => {
    setSelectedId(null);
    setEditingName("");
    setEditingDesc("");
    setEditingSteps([
      {
        id: `new-step-0`,
        order: 1,
        templateId: null,
        delayDays: 0,
        subject: "",
        body: "",
        status: "active",
      },
    ]);
    setShowNew(true);
  };

  const handleAddStep = () => {
    setEditingSteps((prev) => [
      ...prev,
      {
        id: `new-step-${prev.length}`,
        order: prev.length + 1,
        templateId: null,
        delayDays: 3,
        subject: "",
        body: "",
        status: "active",
      },
    ]);
  };

  const handleUpdateStep = (index: number, patch: Partial<SequenceStep>) => {
    setEditingSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...patch } : step))
    );
  };

  const handleDeleteStep = (index: number) => {
    setEditingSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveStep = (from: number, to: number) => {
    setEditingSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    if (!editingName.trim()) {
      toast.error("Sequence name is required");
      return;
    }
    if (editingSteps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    if (selectedId) {
      await updateSequence(selectedId, {
        name: editingName,
        description: editingDesc,
        steps: editingSteps,
      });
      toast.success("Sequence updated");
    } else {
      await createSequence({
        name: editingName,
        description: editingDesc,
        steps: editingSteps,
      });
      toast.success("Sequence created");
    }

    await reloadSequences();
    setShowNew(false);
    setSelectedId(null);
  };

  const handleToggleActive = async (id: string) => {
    const seq = sequences.find((s) => s.id === id);
    if (!seq) return;
    await updateSequence(id, { isActive: !seq.isActive });
    await reloadSequences();
    toast.success(seq.isActive ? "Sequence paused" : "Sequence activated");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sequence?")) return;
    await deleteSequence(id);
    await reloadSequences();
    setSelectedId(null);
    setShowNew(false);
    toast.success("Sequence deleted");
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Sequence list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Sequences</h3>
          <Button size="sm" onClick={handleNew} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>

        {sequences.length === 0 && (
          <p className="text-xs text-muted-foreground">No sequences yet. Create one to get started.</p>
        )}

        {sequences.map((seq) => (
          <Card
            key={seq.id}
            className={cn(
              "cursor-pointer transition-colors",
              selectedId === seq.id && "border-primary"
            )}
            onClick={() => handleSelect(seq.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{seq.name}</p>
                  <p className="text-xs text-muted-foreground">{seq.steps.length} steps</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={seq.isActive ? "default" : "outline"} className="text-[10px]">
                    {seq.isActive ? "Active" : "Draft"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(seq.id);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    {seq.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Editor */}
      <div className="lg:col-span-2">
        {(selectedId || showNew) ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {showNew ? "New Sequence" : "Edit Sequence"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="e.g., Cold Email Follow-up"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Email Steps</Label>
                  <Button size="sm" variant="outline" onClick={handleAddStep} className="gap-1">
                    <Plus className="h-3 w-3" />
                    Add Step
                  </Button>
                </div>

                {editingSteps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    {i > 0 && (
                      <div className="flex justify-center">
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <StepCard
                      step={step}
                      index={i}
                      totalSteps={editingSteps.length}
                      onUpdate={(patch) => handleUpdateStep(i, patch)}
                      onDelete={() => handleDeleteStep(i)}
                      onMoveUp={() => i > 0 && handleMoveStep(i, i - 1)}
                      onMoveDown={() => i < editingSteps.length - 1 && handleMoveStep(i, i + 1)}
                    />
                  </React.Fragment>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                {selectedId && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(selectedId)}
                  >
                    Delete Sequence
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => { setSelectedId(null); setShowNew(false); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="gap-1">
                    <Save className="h-3.5 w-3.5" />
                    Save Sequence
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">Select a sequence to edit</p>
              <p className="text-xs text-muted-foreground">
                Or create a new one to design your email outreach flow
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
