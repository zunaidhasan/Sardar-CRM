"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { showUndoToast } from "@/lib/undo-toast";
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe,
  Loader2,
  Mail,
  Plus,
  Rocket,
  Search,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useKeyboardShortcuts, type ShortcutAction } from "@/hooks/use-keyboard-shortcuts";
import { ShortcutsHelp } from "@/components/outbound/shortcuts-help";
import {
  LEAD_SCORE_META,
  OUTREACH_STATUS_LIST,
  OUTREACH_STATUS_META,
  COUNTRY_LIST,
  INDUSTRY_LIST,
  LEAD_SOURCE_LIST,
} from "@/lib/constants";
import {
  updateOutreachStatusAction,
  updateLeadScoreAction,
  updateNextFollowUpAction,
  markFollowUpSentAction,
  saveWebsiteReviewAction,
  createClientAction,
  assignLeadOwnerAction,
  bulkUpdateOutreachStatusAction,
  bulkUpdateLeadScoreAction,
  bulkUpdateOwnerAction,
  bulkUpdateFollowUpDateAction,
  bulkAutoScoreAction,
  bulkEnrichLeadsAction,
} from "@/app/actions";
import { LeadActivityTimeline } from "@/components/outbound/lead-activity-timeline";
import type { Activity, Client, LeadScore, OutreachStatus, TeamMember } from "@/lib/types";

type SortField = "company" | "next_follow_up" | "lead_score" | "outreach_status";
type SortDir = "asc" | "desc";

const SCORE_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

export function OutboundLeadsList({
  leads,
  userName,
  teamMembers = [],
  activitiesByClient,
}: {
  leads: Client[];
  userName?: string | null;
  teamMembers?: TeamMember[];
  activitiesByClient?: Map<string, Activity[]>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");
  const [filterCountry, setFilterCountry] = React.useState("all");
  const [filterIndustry, setFilterIndustry] = React.useState("all");
  const [filterScore, setFilterScore] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [filterOwner, setFilterOwner] = React.useState("all");
  const [filterTag, setFilterTag] = React.useState("all");
  const [sortField, setSortField] = React.useState<SortField>("next_follow_up");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [showFilters, setShowFilters] = React.useState(false);

  // Selection state
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Quick add dialog
  const [addOpen, setAddOpen] = React.useState(false);
  const [addSaving, setAddSaving] = React.useState(false);

  // Website review dialog
  const [reviewClient, setReviewClient] = React.useState<Client | null>(null);
  const [reviewProblem, setReviewProblem] = React.useState("");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [reviewSaving, setReviewSaving] = React.useState(false);

  // Follow-up date dialog
  const [followUpClient, setFollowUpClient] = React.useState<Client | null>(null);
  const [followUpDate, setFollowUpDate] = React.useState("");
  const [followUpSaving, setFollowUpSaving] = React.useState(false);

  // Bulk action state
  const [bulkAction, setBulkAction] = React.useState<string>("");
  const [bulkValue, setBulkValue] = React.useState("");
  const [bulkSaving, setBulkSaving] = React.useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false);

  // Keyboard shortcuts
  const [focusedRow, setFocusedRow] = React.useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const tableRef = React.useRef<HTMLTableElement>(null);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setAddOpen(true);
  }, [searchParams]);

  // Filter leads
  const filtered = React.useMemo(() => {
    let result = leads;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.website ?? "").toLowerCase().includes(q),
      );
    }
    if (filterCountry !== "all") {
      result = result.filter((c) => c.country === filterCountry);
    }
    if (filterIndustry !== "all") {
      result = result.filter((c) => c.industry === filterIndustry);
    }
    if (filterScore !== "all") {
      result = result.filter((c) => c.lead_score === filterScore);
    }
    if (filterStatus !== "all") {
      result = result.filter((c) => c.outreach_status === filterStatus);
    }
    if (filterOwner !== "all") {
      if (filterOwner === "unassigned") {
        result = result.filter((c) => !c.owner_id);
      } else {
        result = result.filter((c) => c.owner_id === filterOwner);
      }
    }
    if (filterTag !== "all") {
      result = result.filter((c) => c.tags?.includes(filterTag));
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "company":
          cmp = (a.company ?? a.name).localeCompare(b.company ?? b.name);
          break;
        case "next_follow_up":
          const aDate = a.next_follow_up_date ?? "9999-12-31";
          const bDate = b.next_follow_up_date ?? "9999-12-31";
          cmp = aDate.localeCompare(bDate);
          break;
        case "lead_score":
          cmp = (SCORE_ORDER[a.lead_score ?? ""] ?? 0) - (SCORE_ORDER[b.lead_score ?? ""] ?? 0);
          break;
        case "outreach_status":
          cmp = OUTREACH_STATUS_LIST.indexOf(a.outreach_status) - OUTREACH_STATUS_LIST.indexOf(b.outreach_status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [leads, query, filterCountry, filterIndustry, filterScore, filterStatus, filterOwner, filterTag, sortField, sortDir]);

  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    for (const lead of leads) {
      if (lead.tags) {
        for (const tag of lead.tags) tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [leads]);

  const activeFilters = [filterCountry, filterIndustry, filterScore, filterStatus, filterOwner, filterTag].filter(
    (f) => f !== "all",
  ).length;

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Keyboard shortcuts handler
  const handleShortcut = React.useCallback((action: ShortcutAction) => {
    const targetId = focusedRow ?? (selected.size === 1 ? Array.from(selected)[0] : null);
    if (!targetId && action.type !== "clear_selection" && action.type !== "show_help") {
      toast.info("Select or focus a lead row first (click a row)");
      return;
    }

    switch (action.type) {
      case "status": {
        const status = OUTREACH_STATUS_LIST[action.value];
        if (status && targetId) handleQuickStatusChange(targetId, status);
        break;
      }
      case "score": {
        if (targetId) handleQuickScoreChange(targetId, action.value as LeadScore);
        break;
      }
      case "follow_up": {
        if (targetId) {
          const lead = leads.find((l) => l.id === targetId);
          if (lead) openFollowUp(lead);
        }
        break;
      }
      case "review": {
        if (targetId) {
          const lead = leads.find((l) => l.id === targetId);
          if (lead) openReview(lead);
        }
        break;
      }
      case "clear_selection":
        setSelected(new Set());
        setFocusedRow(null);
        break;
      case "show_help":
        setShortcutsOpen(true);
        break;
    }
  }, [focusedRow, selected, leads]);

  useKeyboardShortcuts({ onAction: handleShortcut });

  async function handleQuickStatusChange(clientId: string, status: OutreachStatus) {
    const lead = leads.find((l) => l.id === clientId);
    const previousStatus = lead?.outreach_status;
    const result = await updateOutreachStatusAction(clientId, status);
    if (result.ok) {
      router.refresh();
      if (previousStatus && previousStatus !== status) {
        showUndoToast({
          message: `Status changed to ${status}`,
          onUndo: async () => {
            await updateOutreachStatusAction(clientId, previousStatus);
            router.refresh();
          },
        });
      } else {
        toast.success(`Status updated to ${status}`);
      }
    } else {
      toast.error(result.error);
    }
  }

  async function handleQuickScoreChange(clientId: string, score: LeadScore | null) {
    const lead = leads.find((l) => l.id === clientId);
    const previousScore = lead?.lead_score;
    const result = await updateLeadScoreAction(clientId, score);
    if (result.ok) {
      router.refresh();
      if (previousScore !== score) {
        showUndoToast({
          message: score ? `Score set to ${score}` : "Score cleared",
          onUndo: async () => {
            await updateLeadScoreAction(clientId, previousScore ?? null);
            router.refresh();
          },
        });
      } else {
        toast.success(score ? `Score set to ${score}` : "Score cleared");
      }
    } else {
      toast.error(result.error);
    }
  }

  async function handleMarkFollowUp(clientId: string) {
    const result = await markFollowUpSentAction(clientId);
    if (result.ok) {
      toast.success("Follow-up marked as sent");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleOwnerChange(clientId: string, ownerId: string) {
    const result = await assignLeadOwnerAction(clientId, ownerId || null);
    if (result.ok) {
      toast.success("Owner updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  // Bulk actions
  async function executeBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    setBulkSaving(true);
    const ids = Array.from(selected);
    let result;
    switch (bulkAction) {
      case "status":
        result = await bulkUpdateOutreachStatusAction(ids, bulkValue as OutreachStatus);
        break;
      case "score":
        result = await bulkUpdateLeadScoreAction(ids, (bulkValue || null) as LeadScore | null);
        break;
      case "owner":
        result = await bulkUpdateOwnerAction(ids, bulkValue || null);
        break;
      case "follow_up":
        result = await bulkUpdateFollowUpDateAction(ids, bulkValue || null);
        break;
      case "auto_score": {
        const autoResult = await bulkAutoScoreAction(ids);
        if (autoResult.ok) {
          toast.success(`${autoResult.data?.updated ?? 0} leads auto-scored`);
          setSelected(new Set());
          setBulkAction("");
          setBulkValue("");
          setBulkSaving(false);
          router.refresh();
          return;
        }
        result = autoResult;
        break;
      }
      case "enrich": {
        const enrichResult = await bulkEnrichLeadsAction(ids);
        if (enrichResult.ok) {
          const enriched = enrichResult.data?.enriched ?? 0;
          const errCount = enrichResult.data?.errors?.length ?? 0;
          toast.success(
            `${enriched} lead${enriched !== 1 ? "s" : ""} enriched` +
            (errCount > 0 ? ` (${errCount} failed)` : "")
          );
          setSelected(new Set());
          setBulkAction("");
          setBulkValue("");
          setBulkSaving(false);
          router.refresh();
          return;
        }
        result = enrichResult;
        break;
      }
      default:
        setBulkSaving(false);
        return;
    }
    setBulkSaving(false);
    if (result.ok) {
      toast.success(`${result.data?.updated ?? 0} leads updated`);
      setSelected(new Set());
      setBulkAction("");
      setBulkValue("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function openReview(client: Client) {
    setReviewClient(client);
    setReviewProblem(client.main_problem_found ?? "");
    setReviewNotes(client.website_review_notes ?? "");
  }

  async function saveReview() {
    if (!reviewClient) return;
    setReviewSaving(true);
    const result = await saveWebsiteReviewAction(
      reviewClient.id,
      reviewProblem.trim() || null,
      reviewNotes.trim() || null,
    );
    setReviewSaving(false);
    if (result.ok) {
      toast.success("Website review saved");
      setReviewClient(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function openFollowUp(client: Client) {
    setFollowUpClient(client);
    setFollowUpDate(client.next_follow_up_date ?? new Date().toISOString().slice(0, 10));
  }

  async function saveFollowUpDate() {
    if (!followUpClient) return;
    setFollowUpSaving(true);
    const result = await updateNextFollowUpAction(
      followUpClient.id,
      followUpDate || null,
    );
    setFollowUpSaving(false);
    if (result.ok) {
      toast.success("Follow-up date updated");
      setFollowUpClient(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleQuickAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const website = String(form.get("website") ?? "").trim();
    if (!name) {
      toast.error("Contact name is required");
      return;
    }
    setAddSaving(true);
    const result = await createClientAction({
      name,
      email: email || null,
      company: company || null,
      platform: null,
      username: null,
      profile_url: null,
      category: String(form.get("industry") ?? "") || null,
      account_id: null,
      tags: [],
      notes: null,
      lead_score: (form.get("lead_score") as LeadScore) || null,
      country: String(form.get("country") ?? "") || null,
      industry: String(form.get("industry") ?? "") || null,
      website: website || null,
      linkedin_url: String(form.get("linkedin_url") ?? "") || null,
      main_problem_found: null,
      website_review_notes: null,
      source: String(form.get("source") ?? "") || null,
      outreach_status: "New",
      email_verified: false,
      last_email_sent_at: null,
      next_follow_up_date: null,
      follow_up_count: 0,
      owner_id: null,
    });
    setAddSaving(false);
    if (result.ok) {
      toast.success("Lead added");
      setAddOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads..."
              className="pl-8"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilters > 0 && (
              <Badge className="ml-1 h-5 w-5 rounded-full p-0 text-[10px]">
                {activeFilters}
              </Badge>
            )}
          </Button>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus /> Add lead
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium text-primary">
            {selected.size} lead{selected.size > 1 ? "s" : ""} selected
          </span>
          <Select value={bulkAction} onValueChange={(v) => { setBulkAction(v); setBulkValue(""); }}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Choose action..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Change status</SelectItem>
              <SelectItem value="score">Change score</SelectItem>
              <SelectItem value="owner">Assign owner</SelectItem>
              <SelectItem value="follow_up">Set follow-up date</SelectItem>
              <SelectItem value="auto_score">Auto-score (AI)</SelectItem>
              <SelectItem value="enrich">Enrich (Apollo/Hunter)</SelectItem>
            </SelectContent>
          </Select>

          {bulkAction === "status" && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {bulkAction === "score" && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder="Select score" />
              </SelectTrigger>
              <SelectContent>
                {(["High", "Medium", "Low"] as LeadScore[]).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {bulkAction === "owner" && (
            <Select value={bulkValue} onValueChange={setBulkValue}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.filter((m) => m.is_active).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {bulkAction === "follow_up" && (
            <Input
              type="date"
              className="h-8 w-[160px]"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
            />
          )}

          <Button
            size="sm"
            disabled={bulkSaving || !bulkValue}
            onClick={() => {
              // Confirm before applying bulk changes to multiple leads
              if (selected.size >= 3) {
                setBulkConfirmOpen(true);
              } else {
                executeBulkAction();
              }
            }}
          >
            {bulkSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setSelected(new Set()); setBulkAction(""); setBulkValue(""); }}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {COUNTRY_LIST.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterIndustry} onValueChange={setFilterIndustry}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {INDUSTRY_LIST.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterScore} onValueChange={setFilterScore}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All scores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scores</SelectItem>
              {(["High", "Medium", "Low"] as LeadScore[]).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {OUTREACH_STATUS_LIST.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.filter((m) => m.is_active).map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCountry("all");
                setFilterIndustry("all");
                setFilterScore("all");
                setFilterStatus("all");
                setFilterOwner("all");
                setFilterTag("all");
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Leads table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No outbound leads"
          description={
            query || activeFilters > 0
              ? "No leads match your filters."
              : "Add your first outbound lead or import from a spreadsheet."
          }
          action={
            !query && activeFilters === 0 && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus /> Add lead
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("company")} className="flex items-center gap-1 hover:text-foreground">
                    Company / Contact <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("lead_score")} className="flex items-center gap-1 hover:text-foreground">
                    Score <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("outreach_status")} className="flex items-center gap-1 hover:text-foreground">
                    Status <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => toggleSort("next_follow_up")} className="flex items-center gap-1 hover:text-foreground">
                    Next Follow-up <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const owner = teamMembers.find((m) => m.id === lead.owner_id);
                return (
                  <tr
                    key={lead.id}
                    tabIndex={0}
                    onClick={() => setFocusedRow(lead.id)}
                    className={cn(
                      "border-b last:border-b-0 transition-colors hover:bg-muted/30 cursor-pointer",
                      selected.has(lead.id) && "bg-primary/5",
                      focusedRow === lead.id && "ring-2 ring-primary/50 bg-primary/5",
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        aria-label={`Select ${lead.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${lead.id}`} className="group block">
                        <p className="font-medium group-hover:text-primary">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.company || "—"}
                          {lead.email && <span className="ml-2 text-muted-foreground/60">· {lead.email}</span>}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{lead.country || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{lead.industry || "—"}</span>
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {lead.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                          {lead.tags.length > 2 && (
                            <span className="text-[10px] text-muted-foreground/50">+{lead.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={lead.lead_score ?? ""}
                        onValueChange={(v) =>
                          handleQuickScoreChange(lead.id, (v || null) as LeadScore | null)
                        }
                      >
                        <SelectTrigger className="h-8 w-[110px] border-0 bg-transparent text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue>
                            {lead.lead_score ? (
                              <Badge variant="outline" className={cn("border text-xs", LEAD_SCORE_META[lead.lead_score].badge)}>
                                {lead.lead_score}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(["High", "Medium", "Low"] as LeadScore[]).map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={lead.outreach_status}
                        onValueChange={(v) =>
                          handleQuickStatusChange(lead.id, v as OutreachStatus)
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue>
                            <Badge variant="outline" className={cn("border text-xs", OUTREACH_STATUS_META[lead.outreach_status].badge)}>
                              {lead.outreach_status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {OUTREACH_STATUS_LIST.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      {lead.next_follow_up_date ? (
                        <button
                          onClick={() => openFollowUp(lead)}
                          className={cn(
                            "flex items-center gap-1 text-xs hover:text-primary",
                            new Date(lead.next_follow_up_date) < new Date() && "text-rose-500 font-medium",
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          {lead.next_follow_up_date}
                        </button>
                      ) : (
                        <button
                          onClick={() => openFollowUp(lead)}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          Set date
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={lead.owner_id ?? ""}
                        onValueChange={(v) => handleOwnerChange(lead.id, v || "")}
                      >
                        <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue>
                            {owner ? (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <User className="h-3 w-3" />
                                {owner.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.filter((m) => m.is_active).map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <LeadActivityTimeline
                        activities={activitiesByClient?.get(lead.id) ?? []}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.website && (
                          <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                            <a href={lead.website} target="_blank" rel="noreferrer">
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Website review"
                          onClick={() => openReview(lead)}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Mark follow-up sent"
                          onClick={() => handleMarkFollowUp(lead.id)}
                        >
                          <Rocket className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add outbound lead</DialogTitle>
            <DialogDescription>
              Add a new lead to your cold email campaign.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="add-name">Contact name *</Label>
                <Input id="add-name" name="name" required placeholder="John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-company">Company</Label>
                <Input id="add-company" name="company" placeholder="Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input id="add-email" name="email" type="email" placeholder="john@acme.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-website">Website</Label>
                <Input id="add-website" name="website" placeholder="https://acme.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-linkedin">LinkedIn URL</Label>
                <Input id="add-linkedin" name="linkedin_url" placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select name="country">
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_LIST.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select name="industry">
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_LIST.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead Score</Label>
                <Select name="lead_score">
                  <SelectTrigger>
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                  <SelectContent>
                    {(["High", "Medium", "Low"] as LeadScore[]).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select name="source">
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_LIST.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Website Review Dialog */}
      <Dialog open={!!reviewClient} onOpenChange={(o) => { if (!o) setReviewClient(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Website Review — {reviewClient?.name}</DialogTitle>
            <DialogDescription>
              Document problems found on the lead&apos;s website for personalized outreach.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Main Problem Found</Label>
              <Input
                value={reviewProblem}
                onChange={(e) => setReviewProblem(e.target.value)}
                placeholder="e.g. Slow loading, broken mobile, no CTA"
              />
            </div>
            <div className="space-y-2">
              <Label>Detailed Review Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={5}
                placeholder="Detailed notes about the website review..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewClient(null)}>Cancel</Button>
            <Button onClick={saveReview} disabled={reviewSaving}>
              {reviewSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Date Dialog */}
      <Dialog open={!!followUpClient} onOpenChange={(o) => { if (!o) setFollowUpClient(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Follow-up Date</DialogTitle>
            <DialogDescription>
              {followUpClient?.name} — current follow-ups: {followUpClient?.follow_up_count ?? 0}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Next follow-up date</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpClient(null)}>Cancel</Button>
            <Button onClick={saveFollowUpDate} disabled={followUpSaving}>
              {followUpSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk action confirmation dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm bulk update</DialogTitle>
            <DialogDescription>
              You&apos;re about to update {selected.size} leads. This action will apply
              {bulkAction === "status" && ` status → ${bulkValue}`}
              {bulkAction === "score" && ` score → ${bulkValue || "(clear)"}`}
              {bulkAction === "owner" && ` owner → ${bulkValue || "(unassign)"}`}
              {bulkAction === "follow_up" && ` follow-up date → ${bulkValue}`}
              {bulkAction === "auto_score" && " auto-scoring based on lead data"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setBulkConfirmOpen(false); executeBulkAction(); }}>
              {bulkSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard shortcuts help */}
      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
