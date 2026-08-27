// ---------------------------------------------------------------------------
// Visual Workflow Builder Types & Constants
//
// Defines the node-based workflow system for the drag-and-drop automation
// builder. Each workflow is a directed graph of trigger → condition → action
// nodes connected by edges.
// ---------------------------------------------------------------------------

import { KANBAN_STAGES, STAGE_META } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Node Types
// ---------------------------------------------------------------------------

export type WorkflowNodeType = "trigger" | "action" | "condition";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  config: TriggerConfig | ActionConfig | ConditionConfig;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string; // for conditions: "true" | "false"
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Trigger Configs
// ---------------------------------------------------------------------------

export type TriggerType =
  | "deal_stage_changed"
  | "project_created"
  | "project_completed"
  | "invoice_created"
  | "invoice_overdue"
  | "invoice_paid"
  | "lead_created"
  | "lead_replied"
  | "follow_up_due"
  | "manual";

export interface TriggerConfig {
  trigger_type: TriggerType;
  stage_value?: string;   // for deal_stage_changed
  label: string;
}

export const TRIGGER_OPTIONS: Array<{
  value: TriggerType;
  label: string;
  icon: string;
  description: string;
  hasValue?: boolean;
  valueLabel?: string;
  valueOptions?: Array<{ value: string; label: string }>;
}> = [
  {
    value: "deal_stage_changed",
    label: "Deal stage changed",
    icon: "ArrowRightLeft",
    description: "When a deal moves to a specific pipeline stage",
    hasValue: true,
    valueLabel: "Target stage",
    valueOptions: KANBAN_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label })),
  },
  {
    value: "project_created",
    label: "Project created",
    icon: "FolderKanban",
    description: "When a new project is added",
  },
  {
    value: "project_completed",
    label: "Project completed",
    icon: "CheckCircle2",
    description: "When a project status changes to complete",
  },
  {
    value: "invoice_created",
    label: "Invoice created",
    icon: "FileText",
    description: "When a new invoice is generated",
  },
  {
    value: "invoice_overdue",
    label: "Invoice overdue",
    icon: "AlertTriangle",
    description: "When an invoice passes its due date",
  },
  {
    value: "invoice_paid",
    label: "Invoice paid",
    icon: "DollarSign",
    description: "When an invoice is marked as paid",
  },
  {
    value: "lead_created",
    label: "New lead added",
    icon: "UserPlus",
    description: "When a new outbound lead is created",
  },
  {
    value: "lead_replied",
    label: "Lead replied",
    icon: "Reply",
    description: "When a lead responds to outreach",
  },
  {
    value: "follow_up_due",
    label: "Follow-up due",
    icon: "Clock",
    description: "When a follow-up date arrives",
  },
];

// ---------------------------------------------------------------------------
// Action Configs
// ---------------------------------------------------------------------------

export type ActionType =
  | "create_project"
  | "create_invoice"
  | "log_activity"
  | "send_notification"
  | "update_lead_score"
  | "assign_owner"
  | "update_deal_stage"
  | "send_email"
  | "create_todo"
  | "webhook";

export interface ActionConfig {
  action_type: ActionType;
  label: string;
  params: Record<string, string>;
}

export const ACTION_OPTIONS: Array<{
  value: ActionType;
  label: string;
  icon: string;
  description: string;
  params: Array<{ key: string; label: string; placeholder: string; type?: "text" | "select"; options?: Array<{ value: string; label: string }> }>;
}> = [
  {
    value: "create_project",
    label: "Create project",
    icon: "FolderKanban",
    description: "Auto-create a project from the deal",
    params: [
      { key: "project_name", label: "Project name", placeholder: "{{deal.title}}" },
      { key: "assign_to", label: "Assign to", placeholder: "Team member name", type: "select", options: [] },
    ],
  },
  {
    value: "create_invoice",
    label: "Create invoice",
    icon: "FileText",
    description: "Generate a draft invoice",
    params: [
      { key: "amount", label: "Amount", placeholder: "{{deal.amount}}" },
      { key: "description", label: "Description", placeholder: "Invoice for {{deal.title}}" },
    ],
  },
  {
    value: "log_activity",
    label: "Log activity",
    icon: "Activity",
    description: "Add a note to the activity feed",
    params: [
      { key: "subject", label: "Subject", placeholder: "Automation fired" },
      { key: "body", label: "Body", placeholder: "Details..." },
    ],
  },
  {
    value: "send_notification",
    label: "Send notification",
    icon: "Bell",
    description: "Notify the team via webhook or in-app",
    params: [
      { key: "channel", label: "Channel", placeholder: "Select channel", type: "select", options: [
        { value: "in_app", label: "In-app notification" },
        { value: "slack", label: "Slack" },
        { value: "email", label: "Email" },
      ]},
      { key: "message", label: "Message", placeholder: "Notification message" },
    ],
  },
  {
    value: "update_lead_score",
    label: "Update lead score",
    icon: "Star",
    description: "Change the lead score rating",
    params: [
      { key: "score", label: "Score", placeholder: "Select score", type: "select", options: [
        { value: "High", label: "High" },
        { value: "Medium", label: "Medium" },
        { value: "Low", label: "Low" },
      ]},
    ],
  },
  {
    value: "assign_owner",
    label: "Assign owner",
    icon: "UserCheck",
    description: "Assign a team member as owner",
    params: [
      { key: "owner", label: "Owner", placeholder: "Team member name" },
    ],
  },
  {
    value: "update_deal_stage",
    label: "Update deal stage",
    icon: "ArrowRightLeft",
    description: "Move the deal to a different stage",
    params: [
      { key: "stage", label: "Target stage", placeholder: "Select stage", type: "select", options: KANBAN_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label })) },
    ],
  },
  {
    value: "send_email",
    label: "Send email",
    icon: "Mail",
    description: "Send an email using a template",
    params: [
      { key: "template_id", label: "Template", placeholder: "Select template" },
      { key: "to", label: "To", placeholder: "{{client.email}}" },
    ],
  },
  {
    value: "create_todo",
    label: "Create to-do",
    icon: "CheckSquare",
    description: "Add a task to a project",
    params: [
      { key: "title", label: "Task title", placeholder: "Follow up with client" },
      { key: "assignee", label: "Assignee", placeholder: "Team member" },
    ],
  },
  {
    value: "webhook",
    label: "Fire webhook",
    icon: "Webhook",
    description: "Call an external HTTP endpoint",
    params: [
      { key: "url", label: "URL", placeholder: "https://your-api.com/webhook" },
      { key: "method", label: "Method", placeholder: "POST", type: "select", options: [
        { value: "POST", label: "POST" },
        { value: "GET", label: "GET" },
      ]},
    ],
  },
];

// ---------------------------------------------------------------------------
// Condition Configs
// ---------------------------------------------------------------------------

export type ConditionField =
  | "deal.amount"
  | "deal.platform"
  | "deal.stage"
  | "project.status"
  | "project.gross_amount"
  | "client.outreach_status"
  | "client.lead_score"
  | "invoice.status"
  | "invoice.amount";

export type ConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains";

export interface ConditionConfig {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  label: string;
}

export const CONDITION_FIELDS: Array<{
  value: ConditionField;
  label: string;
  type: "number" | "string" | "enum";
  options?: Array<{ value: string; label: string }>;
}> = [
  { value: "deal.amount", label: "Deal amount", type: "number" },
  { value: "deal.platform", label: "Deal platform", type: "enum", options: [
    { value: "upwork", label: "Upwork" },
    { value: "fiverr", label: "Fiverr" },
    { value: "direct", label: "Direct" },
  ]},
  { value: "deal.stage", label: "Deal stage", type: "enum", options: KANBAN_STAGES.map((s) => ({ value: s, label: STAGE_META[s].label })) },
  { value: "project.status", label: "Project status", type: "enum", options: [
    { value: "wip", label: "WIP" },
    { value: "complete", label: "Complete" },
    { value: "delivered", label: "Delivered" },
  ]},
  { value: "project.gross_amount", label: "Project gross amount", type: "number" },
  { value: "client.outreach_status", label: "Lead status", type: "enum", options: [
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Replied", label: "Replied" },
    { value: "Won", label: "Won" },
    { value: "Lost", label: "Lost" },
  ]},
  { value: "client.lead_score", label: "Lead score", type: "enum", options: [
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ]},
  { value: "invoice.status", label: "Invoice status", type: "enum", options: [
    { value: "draft", label: "Draft" },
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]},
  { value: "invoice.amount", label: "Invoice amount", type: "number" },
];

export const CONDITION_OPERATORS: Array<{
  value: ConditionOperator;
  label: string;
}> = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "contains", label: "Contains" },
];

// ---------------------------------------------------------------------------
// Node sizing & layout
// ---------------------------------------------------------------------------

export const NODE_WIDTH = 260;
export const NODE_MIN_HEIGHT = 80;
export const HANDLE_SIZE = 12;
export const GRID_SIZE = 20;

// Colors per node type
export const NODE_COLORS: Record<WorkflowNodeType, { bg: string; border: string; header: string; text: string }> = {
  trigger: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-300 dark:border-emerald-700",
    header: "bg-emerald-100 dark:bg-emerald-900",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  action: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-300 dark:border-blue-700",
    header: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-700 dark:text-blue-300",
  },
  condition: {
    bg: "bg-amber-50 dark:bg-amber-950/50",
    border: "border-amber-300 dark:border-amber-700",
    header: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-700 dark:text-amber-300",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _counter = 0;
export function generateNodeId(): string {
  return `wf-node-${Date.now()}-${++_counter}`;
}

export function generateEdgeId(): string {
  return `wf-edge-${Date.now()}-${++_counter}`;
}

/**
 * Convert a workflow to AutomationRule objects for the existing system.
 */
export function workflowToAutomationRules(workflow: Workflow): Array<{
  name: string;
  trigger_event: string;
  trigger_value: string | null;
  action_type: string;
  action_data: Record<string, unknown>;
  is_active: boolean;
}> {
  const triggers = workflow.nodes.filter((n) => n.type === "trigger");
  const results: Array<{
    name: string;
    trigger_event: string;
    trigger_value: string | null;
    action_type: string;
    action_data: Record<string, unknown>;
    is_active: boolean;
  }> = [];

  for (const trigger of triggers) {
    const tc = trigger.config as TriggerConfig;
    // Find all actions reachable from this trigger
    const reachableActions = getReachableActions(trigger.id, workflow);

    for (const action of reachableActions) {
      const ac = action.config as ActionConfig;
      results.push({
        name: `${workflow.name} — ${tc.label} → ${ac.label}`,
        trigger_event: triggerTypeToEvent(tc.trigger_type),
        trigger_value: tc.stage_value ?? null,
        action_type: ac.action_type,
        action_data: ac.params,
        is_active: workflow.is_active,
      });
    }
  }

  return results;
}

function triggerTypeToEvent(type: TriggerType): string {
  const map: Record<TriggerType, string> = {
    deal_stage_changed: "opportunity.stage_changed",
    project_created: "project.created",
    project_completed: "project.completed",
    invoice_created: "invoice.created",
    invoice_overdue: "invoice.overdue",
    invoice_paid: "invoice.paid",
    lead_created: "lead.created",
    lead_replied: "lead.replied",
    follow_up_due: "follow_up.due",
    manual: "manual",
  };
  return map[type] ?? type;
}

function getReachableActions(nodeId: string, workflow: Workflow): WorkflowNode[] {
  const visited = new Set<string>();
  const actions: WorkflowNode[] = [];

  function dfs(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const edges = workflow.edges.filter((e) => e.sourceNodeId === currentId);
    for (const edge of edges) {
      const target = workflow.nodes.find((n) => n.id === edge.targetNodeId);
      if (!target) continue;
      if (target.type === "action") {
        actions.push(target);
      }
      dfs(target.id);
    }
  }

  dfs(nodeId);
  return actions;
}

/**
 * Create a default starter workflow.
 */
export function createDefaultWorkflow(): Workflow {
  const triggerId = generateNodeId();
  const actionId = generateNodeId();

  return {
    id: `wf-${Date.now()}`,
    name: "New Workflow",
    description: "",
    nodes: [
      {
        id: triggerId,
        type: "trigger",
        config: {
          trigger_type: "deal_stage_changed",
          stage_value: "won",
          label: "Deal moved to Won",
        },
        position: { x: 100, y: 200 },
      },
      {
        id: actionId,
        type: "action",
        config: {
          action_type: "create_project",
          label: "Create project",
          params: {
            project_name: "{{deal.title}}",
            assign_to: "",
          },
        },
        position: { x: 500, y: 200 },
      },
    ],
    edges: [
      {
        id: generateEdgeId(),
        sourceNodeId: triggerId,
        targetNodeId: actionId,
      },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
