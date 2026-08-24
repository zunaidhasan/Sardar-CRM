"use client";

import * as React from "react";
import { Clock, Edit3, Filter, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import type { AuditEntry } from "@/lib/audit-log";

// ---------------------------------------------------------------------------
// Audit Log Viewer
//
// Displays a chronological list of changes made to leads, with field diffs,
// actor names, and timestamps. Supports filtering by actor and search.
// ---------------------------------------------------------------------------

interface AuditLogViewerProps {
  entries: AuditEntry[];
}

export function AuditLogViewer({ entries }: AuditLogViewerProps) {
  const [query, setQuery] = React.useState("");
  const [filterActor, setFilterActor] = React.useState("all");

  const actors = React.useMemo(() => {
    const names = new Set(entries.map((e) => e.userName).filter(Boolean));
    return Array.from(names).sort();
  }, [entries]);

  const filtered = React.useMemo(() => {
    let result = entries;
    if (filterActor !== "all") {
      result = result.filter((e) => e.userName === filterActor);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (e) =>
          e.entityName.toLowerCase().includes(q) ||
          e.field.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          (e.oldValue ?? "").toLowerCase().includes(q) ||
          (e.newValue ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, query, filterActor]);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No audit log entries"
        description="Changes to leads will appear here as they happen."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search changes..."
            className="pl-8"
          />
        </div>
        <select
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="all">All actors</option>
          {actors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Log entries */}
      <div className="space-y-1">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No entries match your filters.
          </p>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/30"
            >
              <Edit3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {entry.field}
                  </Badge>
                  {entry.oldValue && entry.newValue && (
                    <span className="text-xs text-muted-foreground">
                      <span className="line-through opacity-60">{entry.oldValue}</span>
                      {" → "}
                      <span className="font-medium">{entry.newValue}</span>
                    </span>
                  )}
                  {!entry.oldValue && entry.newValue && (
                    <span className="text-xs text-muted-foreground">
                      set to <span className="font-medium">{entry.newValue}</span>
                    </span>
                  )}
                  {entry.oldValue && !entry.newValue && (
                    <span className="text-xs text-muted-foreground">
                      cleared from <span className="line-through opacity-60">{entry.oldValue}</span>
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <User className="h-2.5 w-2.5" />
                    {entry.userName || "System"}
                  </span>
                  <span>·</span>
                  <span>{entry.entityName}</span>
                  <span>·</span>
                  <time dateTime={entry.timestamp}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </time>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
