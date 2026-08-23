"use client";

import * as React from "react";

// ---------------------------------------------------------------------------
// Accessibility Enhancements
//
// Provides ARIA live regions, skip links, and screen reader announcements
// for the outbound leads table and related components.
// ---------------------------------------------------------------------------

/**
 * Screen reader only text (visually hidden but accessible).
 */
export function SROnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only" aria-live="polite">
      {children}
    </span>
  );
}

/**
 * Live region for announcing changes to screen readers.
 * Use this to announce filter changes, bulk action results, etc.
 */
export function LiveRegion({
  message,
  politeness = "polite",
}: {
  message: string;
  politeness?: "polite" | "assertive";
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Keyboard navigation helper for the leads table.
 * Announces the current row and available actions.
 */
export function useTableKeyboardNav({
  rowCount,
  onRowActivate,
  onEscape,
}: {
  rowCount: number;
  onRowActivate?: (index: number) => void;
  onEscape?: () => void;
}) {
  const [focusedRow, setFocusedRow] = React.useState(-1);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedRow((prev) => Math.min(prev + 1, rowCount - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedRow((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedRow >= 0) {
            onRowActivate?.(focusedRow);
          }
          break;
        case "Escape":
          e.preventDefault();
          setFocusedRow(-1);
          onEscape?.();
          break;
        case "Home":
          e.preventDefault();
          setFocusedRow(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedRow(rowCount - 1);
          break;
      }
    },
    [focusedRow, rowCount, onRowActivate, onEscape]
  );

  return {
    focusedRow,
    setFocusedRow,
    handleKeyDown,
    gridNavigationProps: {
      role: "grid" as const,
      "aria-rowcount": rowCount,
      tabIndex: 0,
      onKeyDown: handleKeyDown,
    },
    rowProps: (index: number) => ({
      role: "row" as const,
      "aria-rowindex": index + 1,
      tabIndex: focusedRow === index ? 0 : -1,
      "aria-selected": focusedRow === index,
    }),
  };
}

/**
 * Announce filter changes to screen readers.
 */
export function FilterAnnouncer({ activeFilters }: { activeFilters: number }) {
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (activeFilters > 0) {
      setMessage(`${activeFilters} filter${activeFilters > 1 ? "s" : ""} active`);
    } else {
      setMessage("All filters cleared");
    }
  }, [activeFilters]);

  return <LiveRegion message={message} />;
}

/**
 * Announce bulk action results to screen readers.
 */
export function BulkActionAnnouncer({
  action,
  count,
}: {
  action: string;
  count: number;
}) {
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (count > 0) {
      setMessage(`${action} applied to ${count} lead${count > 1 ? "s" : ""}`);
    }
  }, [action, count]);

  return <LiveRegion message={message} politeness="assertive" />;
}

/**
 * Announce sort changes to screen readers.
 */
export function SortAnnouncer({
  column,
  direction,
}: {
  column: string;
  direction: "asc" | "desc";
}) {
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    setMessage(`Sorted by ${column} ${direction === "asc" ? "ascending" : "descending"}`);
  }, [column, direction]);

  return <LiveRegion message={message} />;
}
