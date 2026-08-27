"use client";

import * as React from "react";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Play,
  Pause,
  Save,
  ArrowRightLeft,
  FolderKanban,
  CheckCircle2,
  FileText,
  AlertTriangle,
  DollarSign,
  UserPlus,
  Reply,
  Clock,
  Activity,
  Bell,
  Star,
  UserCheck,
  Mail,
  CheckSquare,
  Webhook,
  GitBranch,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowNodeType,
  type TriggerConfig,
  type ActionConfig,
  type ConditionConfig,
  type TriggerType,
  type ActionType,
  NODE_WIDTH,
  NODE_COLORS,
  TRIGGER_OPTIONS,
  ACTION_OPTIONS,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  generateNodeId,
  generateEdgeId,
  createDefaultWorkflow,
} from "@/lib/workflow-builder";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowRightLeft, FolderKanban, CheckCircle2, FileText, AlertTriangle,
  DollarSign, UserPlus, Reply, Clock, Activity, Bell, Star, UserCheck,
  Mail, CheckSquare, Webhook, GitBranch,
};

function NodeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? Activity;
  return <Icon className={className} />;
}

// ---------------------------------------------------------------------------
// SVG Edge Component
// ---------------------------------------------------------------------------
function EdgePath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  isTrueBranch,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  label?: string;
  isTrueBranch?: boolean;
}) {
  const midX = (sourceX + targetX) / 2;
  const controlOffset = Math.min(Math.abs(targetX - sourceX) * 0.5, 120);

  const d = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;

  const color = isTrueBranch === false ? "#ef4444" : isTrueBranch === true ? "#22c55e" : "#94a3b8";

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={isTrueBranch !== undefined ? "6 3" : undefined}
        className="transition-colors"
      />
      {/* Arrow head */}
      <circle cx={targetX} cy={targetY} r={4} fill={color} />
      {label && (
        <text
          x={midX}
          y={sourceY - 10}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px] font-medium"
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Workflow Node Component
// ---------------------------------------------------------------------------
function WorkflowNodeComponent({
  node,
  isSelected,
  onSelect,
  onDragStart,
  onRemove,
}: {
  node: WorkflowNode;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onRemove?: () => void;
}) {
  const colors = NODE_COLORS[node.type];
  const config = node.config;

  const headerLabel =
    node.type === "trigger"
      ? (config as TriggerConfig).label
      : node.type === "action"
        ? (config as ActionConfig).label
        : `If: ${(config as ConditionConfig).field} ${(config as ConditionConfig).operator} "${(config as ConditionConfig).value}"`;

  const headerIcon =
    node.type === "trigger"
      ? TRIGGER_OPTIONS.find((t) => t.value === (config as TriggerConfig).trigger_type)?.icon ?? "Activity"
      : node.type === "action"
        ? ACTION_OPTIONS.find((a) => a.value === (config as ActionConfig).action_type)?.icon ?? "Activity"
        : "GitBranch";

  return (
    <div
      className={`absolute select-none cursor-grab active:cursor-grabbing transition-shadow ${colors.border} ${colors.bg} rounded-xl border-2 shadow-md hover:shadow-lg ${
        isSelected ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
      style={{
        width: NODE_WIDTH,
        left: node.position.x,
        top: node.position.y,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDragStart(e);
      }}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 rounded-t-[10px] px-3 py-2 ${colors.header}`}>
        <GripVertical className="h-3.5 w-3.5 opacity-50" />
        <NodeIcon name={headerIcon} className={`h-4 w-4 ${colors.text}`} />
        <span className={`text-xs font-semibold ${colors.text} truncate`}>
          {node.type === "trigger" ? "WHEN" : node.type === "action" ? "THEN" : "IF"}
        </span>
        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[140px]">
          {headerLabel}
        </span>
        {onRemove && (
          <button
            className="ml-1 rounded p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {node.type === "trigger" && (
          <p>
            {(config as TriggerConfig).stage_value
              ? `Stage → ${(config as TriggerConfig).stage_value}`
              : "Fires on event"}
          </p>
        )}
        {node.type === "action" && (
          <div className="space-y-1">
            {Object.entries((config as ActionConfig).params).map(([key, val]) => (
              <p key={key} className="truncate">
                <span className="text-foreground/60">{key}:</span>{" "}
                {val || <span className="italic">not set</span>}
              </p>
            ))}
          </div>
        )}
        {node.type === "condition" && (
          <p className="truncate">
            {CONDITION_FIELDS.find((f) => f.value === (config as ConditionConfig).field)?.label}{" "}
            {CONDITION_OPERATORS.find((o) => o.value === (config as ConditionConfig).operator)?.label}{" "}
            &ldquo;{(config as ConditionConfig).value || "..."}&rdquo;
          </p>
        )}
      </div>

      {/* Handles (connection points) */}
      {/* Input handle (left side) */}
      <div
        className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-background border-2 border-current cursor-crosshair"
        style={{ borderColor: node.type === "trigger" ? "#10b981" : node.type === "action" ? "#3b82f6" : "#f59e0b" }}
        data-handle="input"
        data-node-id={node.id}
      />

      {/* Output handle (right side) */}
      {node.type !== "condition" ? (
        <div
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-background border-2 border-current cursor-crosshair"
          style={{ borderColor: node.type === "trigger" ? "#10b981" : "#3b82f6" }}
          data-handle="output"
          data-node-id={node.id}
        />
      ) : (
        <>
          {/* True handle (bottom-right) */}
          <div
            className="absolute -right-1.5 bottom-3 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background cursor-crosshair"
            data-handle="output-true"
            data-node-id={node.id}
          />
          {/* False handle (bottom-left) */}
          <div
            className="absolute -left-1.5 bottom-3 h-3 w-3 rounded-full bg-rose-500 border-2 border-background cursor-crosshair"
            data-handle="output-false"
            data-node-id={node.id}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node Palette
// ---------------------------------------------------------------------------
function NodePalette({
  onAddNode,
}: {
  onAddNode: (type: WorkflowNodeType, config: TriggerConfig | ActionConfig | ConditionConfig) => void;
}) {
  const [expandedSection, setExpandedSection] = React.useState<"trigger" | "action" | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Add Node
      </p>

      {/* Trigger nodes */}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() =>
          onAddNode("trigger", {
            trigger_type: "deal_stage_changed",
            stage_value: "active",
            label: "Deal stage changed",
          })
        }
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-600">
          <Play className="h-3 w-3" />
        </span>
        <span className="text-xs">Add Trigger</span>
        <Plus className="ml-auto h-3 w-3" />
      </Button>

      {/* Action nodes */}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() =>
          onAddNode("action", {
            action_type: "log_activity",
            label: "Log activity",
            params: { subject: "Automation fired", body: "" },
          })
        }
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-blue-600">
          <Activity className="h-3 w-3" />
        </span>
        <span className="text-xs">Add Action</span>
        <Plus className="ml-auto h-3 w-3" />
      </Button>

      {/* Condition nodes */}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() =>
          onAddNode("condition", {
            field: "deal.amount",
            operator: "greater_than",
            value: "1000",
            label: "Deal amount > 1000",
          })
        }
      >
        <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-amber-600">
          <GitBranch className="h-3 w-3" />
        </span>
        <span className="text-xs">Add Condition</span>
        <Plus className="ml-auto h-3 w-3" />
      </Button>

      <Separator className="my-3" />

      {/* Quick templates */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Templates
      </p>
      <div className="space-y-1.5">
        <TemplateButton
          label="Won deal → Create project"
          onClick={() => {
            const tid = generateNodeId();
            const aid = generateNodeId();
            onAddNode("action", {
              action_type: "create_project",
              label: "Create project",
              params: { project_name: "{{deal.title}}", assign_to: "" },
            });
          }}
        />
        <TemplateButton
          label="Overdue invoice → Notify"
          onClick={() => {
            onAddNode("action", {
              action_type: "send_notification",
              label: "Send notification",
              params: { channel: "slack", message: "Invoice {{invoice.number}} is overdue!" },
            });
          }}
        />
        <TemplateButton
          label="High-value deal → Assign CEO"
          onClick={() => {
            onAddNode("action", {
              action_type: "assign_owner",
              label: "Assign owner",
              params: { owner: "CEO" },
            });
          }}
        />
      </div>
    </div>
  );
}

function TemplateButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      onClick={onClick}
    >
      <Plus className="h-3 w-3 shrink-0" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Node Configuration Panel
// ---------------------------------------------------------------------------
function NodeConfigPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: WorkflowNode | null;
  onUpdate: (node: WorkflowNode) => void;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="rounded-full bg-muted p-4 mb-3">
          <GitBranch className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No node selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Click a node to configure it, or drag to reposition
        </p>
      </div>
    );
  }

  // After early return above, node is guaranteed non-null
  const nodeRef = node!;
  const config = { ...nodeRef.config };

  function handleUpdate(partial: Partial<typeof config>) {
    const updated: WorkflowNode = {
      id: nodeRef.id,
      type: nodeRef.type,
      position: nodeRef.position,
      config: { ...config, ...partial } as typeof config,
    };
    onUpdate(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">
          {node.type} Configuration
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 px-2">
          ×
        </Button>
      </div>

      {node.type === "trigger" && (
        <TriggerConfigEditor
          config={config as TriggerConfig}
          onChange={(patch) => handleUpdate(patch)}
        />
      )}
      {node.type === "action" && (
        <ActionConfigEditor
          config={config as ActionConfig}
          onChange={(patch) => handleUpdate(patch)}
        />
      )}
      {node.type === "condition" && (
        <ConditionConfigEditor
          config={config as ConditionConfig}
          onChange={(patch) => handleUpdate(patch)}
        />
      )}
    </div>
  );
}

function TriggerConfigEditor({
  config,
  onChange,
}: {
  config: TriggerConfig;
  onChange: (patch: Partial<TriggerConfig>) => void;
}) {
  const selectedOption = TRIGGER_OPTIONS.find((t) => t.value === config.trigger_type);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Trigger type</label>
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.trigger_type}
          onChange={(e) => {
            const type = e.target.value as TriggerType;
            const opt = TRIGGER_OPTIONS.find((t) => t.value === type);
            onChange({
              trigger_type: type,
              label: opt?.label ?? type,
              stage_value: opt?.hasValue ? (opt.valueOptions?.[0]?.value ?? "") : undefined,
            });
          }}
        >
          {TRIGGER_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">{selectedOption?.description}</p>
      </div>

      {selectedOption?.hasValue && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{selectedOption.valueLabel}</label>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={config.stage_value ?? ""}
            onChange={(e) => onChange({ stage_value: e.target.value })}
          >
            {selectedOption.valueOptions?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Label</label>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Describe this trigger..."
        />
      </div>
    </div>
  );
}

function ActionConfigEditor({
  config,
  onChange,
}: {
  config: ActionConfig;
  onChange: (patch: Partial<ActionConfig>) => void;
}) {
  const selectedOption = ACTION_OPTIONS.find((a) => a.value === config.action_type);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Action type</label>
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.action_type}
          onChange={(e) => {
            const type = e.target.value as ActionType;
            const opt = ACTION_OPTIONS.find((a) => a.value === type);
            const defaultParams: Record<string, string> = {};
            opt?.params.forEach((p) => {
              defaultParams[p.key] = config.params[p.key] ?? "";
            });
            onChange({
              action_type: type,
              label: opt?.label ?? type,
              params: defaultParams,
            });
          }}
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">{selectedOption?.description}</p>
      </div>

      {selectedOption?.params.map((param) => (
        <div key={param.key} className="space-y-1.5">
          <label className="text-xs font-medium">{param.label}</label>
          {param.type === "select" ? (
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={config.params[param.key] ?? ""}
              onChange={(e) =>
                onChange({ params: { ...config.params, [param.key]: e.target.value } })
              }
            >
              <option value="">Select...</option>
              {param.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={config.params[param.key] ?? ""}
              onChange={(e) =>
                onChange({ params: { ...config.params, [param.key]: e.target.value } })
              }
              placeholder={param.placeholder}
            />
          )}
        </div>
      ))}

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Label</label>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Describe this action..."
        />
      </div>
    </div>
  );
}

function ConditionConfigEditor({
  config,
  onChange,
}: {
  config: ConditionConfig;
  onChange: (patch: Partial<ConditionConfig>) => void;
}) {
  const fieldDef = CONDITION_FIELDS.find((f) => f.value === config.field);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Field to check</label>
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.field}
          onChange={(e) => {
            const field = e.target.value as ConditionConfig["field"];
            const def = CONDITION_FIELDS.find((f) => f.value === field);
            onChange({
              field,
              label: `If ${def?.label ?? field}`,
              value: "",
            });
          }}
        >
          {CONDITION_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Operator</label>
        <select
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.operator}
          onChange={(e) => onChange({ operator: e.target.value as ConditionConfig["operator"] })}
        >
          {CONDITION_OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Value</label>
        {fieldDef?.type === "enum" ? (
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={config.value}
            onChange={(e) => onChange({ value: e.target.value })}
          >
            <option value="">Select...</option>
            {fieldDef.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            type="number"
            value={config.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="Enter value..."
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium">Label</label>
        <input
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={config.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Describe this condition..."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Canvas Component
// ---------------------------------------------------------------------------
export function WorkflowCanvas({
  initialWorkflow,
  onSave,
}: {
  initialWorkflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
}) {
  const [workflow, setWorkflow] = React.useState<Workflow>(
    initialWorkflow ?? createDefaultWorkflow(),
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState<{ nodeId: string; startX: number; startY: number; nodeStartX: number; nodeStartY: number } | null>(null);
  const [connecting, setConnecting] = React.useState<{ sourceNodeId: string; sourceHandle?: string; mouseX: number; mouseY: number } | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  // ---- Zoom ----
  function handleZoomIn() { setZoom((z) => Math.min(z + 0.15, 2)); }
  function handleZoomOut() { setZoom((z) => Math.max(z - 0.15, 0.3)); }
  function handleFitToView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // ---- Canvas panning ----
  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      setSelectedNodeId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      setWorkflow((wf) => ({
        ...wf,
        nodes: wf.nodes.map((n) =>
          n.id === dragging.nodeId
            ? { ...n, position: { x: dragging.nodeStartX + dx, y: dragging.nodeStartY + dy } }
            : n,
        ),
      }));
    }
    if (connecting) {
      setConnecting((c) => c ? { ...c, mouseX: e.clientX, mouseY: e.clientY } : null);
    }
  }

  function handleCanvasMouseUp() {
    setIsPanning(false);
    setDragging(null);
    setConnecting(null);
  }

  // ---- Node dragging ----
  function handleNodeDragStart(nodeId: string, e: React.MouseEvent) {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragging({
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: node.position.x,
      nodeStartY: node.position.y,
    });
  }

  // ---- Connection (edge creation) ----
  function handleOutputMouseDown(nodeId: string, handle?: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setConnecting({
      sourceNodeId: nodeId,
      sourceHandle: handle,
      mouseX: e?.clientX ?? 0,
      mouseY: e?.clientY ?? 0,
    });
  }

  function handleInputMouseUp(nodeId: string) {
    if (!connecting) return;
    if (connecting.sourceNodeId === nodeId) return;
    // Don't create duplicate edges
    const exists = workflow.edges.some(
      (e) => e.sourceNodeId === connecting.sourceNodeId && e.targetNodeId === nodeId,
    );
    if (exists) return;

    setWorkflow((wf) => ({
      ...wf,
      edges: [
        ...wf.edges,
        {
          id: generateEdgeId(),
          sourceNodeId: connecting.sourceNodeId,
          targetNodeId: nodeId,
          sourceHandle: connecting.sourceHandle,
        },
      ],
    }));
    setConnecting(null);
  }

  // ---- Node operations ----
  function handleAddNode(type: WorkflowNodeType, config: TriggerConfig | ActionConfig | ConditionConfig) {
    const existingMaxX = workflow.nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
    const newNode: WorkflowNode = {
      id: generateNodeId(),
      type,
      config,
      position: { x: existingMaxX + NODE_WIDTH + 80, y: 200 },
    };
    setWorkflow((wf) => ({ ...wf, nodes: [...wf.nodes, newNode] }));
    setSelectedNodeId(newNode.id);
  }

  function handleRemoveNode(nodeId: string) {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.filter((n) => n.id !== nodeId),
      edges: wf.edges.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }

  function handleUpdateNode(updated: WorkflowNode) {
    setWorkflow((wf) => ({
      ...wf,
      nodes: wf.nodes.map((n) => (n.id === updated.id ? updated : n)),
    }));
  }

  function handleRemoveEdge(edgeId: string) {
    setWorkflow((wf) => ({
      ...wf,
      edges: wf.edges.filter((e) => e.id !== edgeId),
    }));
  }

  // ---- Edge positions ----
  function getEdgePositions(edge: WorkflowEdge) {
    const source = workflow.nodes.find((n) => n.id === edge.sourceNodeId);
    const target = workflow.nodes.find((n) => n.id === edge.targetNodeId);
    if (!source || !target) return null;

    const sourceX = source.position.x + NODE_WIDTH;
    const sourceY = source.position.y + 50;
    const targetX = target.position.x;
    const targetY = target.position.y + 50;

    return { sourceX, sourceY, targetX, targetY };
  }

  return (
    <div className="flex h-[700px] rounded-xl border bg-card overflow-hidden">
      {/* Left sidebar: Node palette */}
      <div className="w-56 shrink-0 border-r bg-muted/30 p-3 overflow-y-auto">
        <NodePalette onAddNode={handleAddNode} />

        <Separator className="my-4" />

        {/* Workflow settings */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workflow
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Name</label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
              value={workflow.name}
              onChange={(e) => setWorkflow((wf) => ({ ...wf, name: e.target.value }))}
              placeholder="Workflow name..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Description</label>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm resize-none"
              rows={2}
              value={workflow.description}
              onChange={(e) => setWorkflow((wf) => ({ ...wf, description: e.target.value }))}
              placeholder="What does this workflow do?"
            />
          </div>
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border bg-background/80 backdrop-blur p-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleFitToView} title="Reset view">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Status bar */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-lg border bg-background/80 backdrop-blur px-3 py-1.5">
          <Badge variant={workflow.is_active ? "default" : "secondary"} className="text-[10px]">
            {workflow.is_active ? "Active" : "Paused"}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {workflow.nodes.length} nodes · {workflow.edges.length} connections
          </span>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing canvas-bg"
          style={{
            backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "relative",
              width: "4000px",
              height: "4000px",
            }}
          >
            {/* SVG layer for edges */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width="4000"
              height="4000"
              style={{ overflow: "visible" }}
            >
              {workflow.edges.map((edge) => {
                const pos = getEdgePositions(edge);
                if (!pos) return null;
                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Remove this connection?")) handleRemoveEdge(edge.id);
                    }}
                  >
                    <EdgePath
                      sourceX={pos.sourceX}
                      sourceY={pos.sourceY}
                      targetX={pos.targetX}
                      targetY={pos.targetY}
                      isTrueBranch={edge.sourceHandle === "true" ? true : edge.sourceHandle === "false" ? false : undefined}
                      label={edge.label}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {workflow.nodes.map((node) => (
              <WorkflowNodeComponent
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => setSelectedNodeId(node.id)}
                onDragStart={(e) => handleNodeDragStart(node.id, e)}
                onRemove={() => handleRemoveNode(node.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar: Configuration panel */}
      <div className="w-72 shrink-0 border-l bg-muted/30 overflow-y-auto">
        <div className="p-4">
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>

        {selectedNode && (
          <>
            <Separator />
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Connections
              </p>
              <div className="space-y-1.5">
                {workflow.edges
                  .filter((e) => e.sourceNodeId === selectedNode.id || e.targetNodeId === selectedNode.id)
                  .map((edge) => {
                    const otherNode = workflow.nodes.find(
                      (n) => n.id === (edge.sourceNodeId === selectedNode.id ? edge.targetNodeId : edge.sourceNodeId),
                    );
                    const direction = edge.sourceNodeId === selectedNode.id ? "→" : "←";
                    return (
                      <div key={edge.id} className="flex items-center justify-between text-xs rounded border bg-background px-2 py-1.5">
                        <span className="truncate">
                          {direction} {(otherNode?.config as TriggerConfig | ActionConfig | ConditionConfig)?.label ?? "Unknown"}
                        </span>
                        <button
                          className="ml-2 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveEdge(edge.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                {workflow.edges.filter((e) => e.sourceNodeId === selectedNode.id || e.targetNodeId === selectedNode.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No connections. Drag from an output handle to another node&apos;s input.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="p-4">
          <Button
            className="w-full"
            onClick={() => onSave?.(workflow)}
          >
            <Save className="mr-1 h-4 w-4" />
            Save Workflow
          </Button>
        </div>
      </div>
    </div>
  );
}
