import type {
  BidStatus,
  FollowupStatus,
  InvoiceStatus,
  LeadScore,
  MilestoneStatus,
  OpportunityStage,
  OutreachStatus,
  Platform,
  Priority,
  ProjectStatus,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Kanban pipeline
// ---------------------------------------------------------------------------
export const KANBAN_STAGES: OpportunityStage[] = [
  "lead",
  "proposal",
  "negotiation",
  "active",
  "won",
  "lost",
];

export const STAGE_META: Record<OpportunityStage, { label: string; color: string; dot: string }> = {
  lead: { label: "Lead", color: "bg-slate-400", dot: "bg-slate-500" },
  proposal: { label: "Proposal", color: "bg-sky-400", dot: "bg-sky-500" },
  negotiation: { label: "Negotiation", color: "bg-amber-400", dot: "bg-amber-500" },
  active: { label: "Active", color: "bg-violet-400", dot: "bg-violet-500" },
  won: { label: "Won", color: "bg-emerald-400", dot: "bg-emerald-500" },
  lost: { label: "Lost", color: "bg-rose-400", dot: "bg-rose-500" },
};

// ---------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------
export const PLATFORM_META: Record<Platform, { label: string; color: string }> = {
  fiverr: { label: "Fiverr", color: "bg-[#1dbf73]" },
  upwork: { label: "Upwork", color: "bg-[#14a800]" },
  direct: { label: "Direct", color: "bg-slate-500" },
};

// ---------------------------------------------------------------------------
// Project statuses (matches the monthly order sheets)
// ---------------------------------------------------------------------------
export const PROJECT_STATUSES: ProjectStatus[] = [
  "wip",
  "submitted",
  "revision",
  "delivered",
  "complete",
  "cancelled",
  "nra",
  "client_update",
];

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; badge: string }> = {
  wip: { label: "WIP", badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  submitted: { label: "Submitted", badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800" },
  revision: { label: "Revision", badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
  delivered: { label: "Delivered", badge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800" },
  complete: { label: "Complete", badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
  cancelled: { label: "Cancelled", badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800" },
  nra: { label: "NRA", badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
  client_update: { label: "Client Update", badge: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
};

// ---------------------------------------------------------------------------
// Bid statuses (Upwork)
// ---------------------------------------------------------------------------
export const BID_STATUS_META: Record<BidStatus, { label: string; badge: string }> = {
  no_response: { label: "No Response", badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
  only_viewed: { label: "Only Viewed", badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800" },
  response: { label: "Response", badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  interview: { label: "Interview", badge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800" },
  hired: { label: "Hired", badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
  rejected: { label: "Rejected", badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800" },
};

// ---------------------------------------------------------------------------
// Follow-up statuses (Fiverr nurture)
// ---------------------------------------------------------------------------
export const FOLLOWUP_STATUS_META: Record<FollowupStatus, { label: string; badge: string }> = {
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
  follow_up: { label: "Follow Up", badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800" },
  accepted: { label: "Accepted", badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
  complete: { label: "Complete", badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
  nra: { label: "NRA", badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
  no_response: { label: "No Response", badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800" },
  archived: { label: "Archived", badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800" },
};

// ---------------------------------------------------------------------------
// Invoice statuses
// ---------------------------------------------------------------------------
export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"];

export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; badge: string }> = {
  draft: { label: "Draft", badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
  paid: { label: "Paid", badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
  overdue: { label: "Overdue", badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800" },
};

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------
export const MILESTONE_STATUS_META: Record<MilestoneStatus, { label: string }> = {
  pending: { label: "Pending" },
  in_progress: { label: "In Progress" },
  done: { label: "Done" },
};

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------
export const PRIORITY_META: Record<Priority, { label: string; badge: string }> = {
  low: { label: "Low", badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800" },
  medium: { label: "Medium", badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  high: { label: "High", badge: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
  urgent: { label: "Urgent", badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800" },
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: "Note",
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  follow_up: "Follow-up",
  bid: "Bid",
  proposal_sent: "Proposal sent",
  status_change: "Status change",
  invoice: "Invoice",
  import: "Import",
  system: "System",
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  INR: "₹",
  PKR: "₨",
  BDT: "৳",
};

// ---------------------------------------------------------------------------
// Outbound lead metadata (cold email campaign)
// ---------------------------------------------------------------------------
export const LEAD_SCORE_META: Record<LeadScore, { label: string; badge: string; dot: string }> = {
  High: {
    label: "High",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  Medium: {
    label: "Medium",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  Low: {
    label: "Low",
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
    dot: "bg-slate-500",
  },
};

export const OUTREACH_STATUS_LIST: OutreachStatus[] = [
  "New",
  "Contacted",
  "Replied",
  "Meeting",
  "Proposal",
  "Won",
  "Lost",
];

export const OUTREACH_STATUS_META: Record<OutreachStatus, { label: string; badge: string }> = {
  New: {
    label: "New",
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
  },
  Contacted: {
    label: "Contacted",
    badge: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
  },
  Replied: {
    label: "Replied",
    badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  Meeting: {
    label: "Meeting",
    badge: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  },
  Proposal: {
    label: "Proposal",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800",
  },
  Won: {
    label: "Won",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  Lost: {
    label: "Lost",
    badge: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  },
};

export const COUNTRY_LIST = [
  // North America
  "United States", "Canada", "Mexico",
  // Europe
  "United Kingdom", "Germany", "France", "Netherlands", "Spain", "Italy",
  "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria",
  "Belgium", "Ireland", "Portugal", "Poland", "Czech Republic",
  "Romania", "Hungary",
  // Asia-Pacific
  "Australia", "New Zealand", "Singapore", "Japan", "South Korea",
  "India", "Pakistan", "Bangladesh", "Philippines", "Vietnam",
  "Thailand", "Indonesia", "Malaysia",
  // Middle East & Africa
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Israel", "Turkey",
  "South Africa", "Nigeria", "Kenya", "Egypt",
  // Latin America
  "Brazil", "Argentina", "Colombia", "Chile", "Peru",
  // Other
  "Other",
] as const;

export const INDUSTRY_LIST = [
  "eCommerce",
  "Real Estate",
  "Agency",
  "SaaS",
  "Healthcare",
  "Education",
  "Finance",
  "Hospitality",
  "Manufacturing",
  "Retail",
  "Non-Profit",
  "Other",
] as const;

export const LEAD_SOURCE_LIST = [
  "Apollo",
  "Manual",
  "Import",
  "LinkedIn",
  "Hunter",
  "Website",
  "Referral",
  "Cold List",
  "Other",
] as const;

// Follow-up schedule: how many days to wait before the next follow-up
// based on the follow-up count.
export const FOLLOW_UP_SCHEDULE = [
  { after: 3, label: "Follow-up 1" },   // 3-4 days after first contact
  { after: 7, label: "Follow-up 2" },   // 7-8 days after follow-up 1
  { after: 13, label: "Break-up" },      // 12-14 days after follow-up 2
] as const;
