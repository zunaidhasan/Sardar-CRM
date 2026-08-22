"use client";

import { useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Keyboard shortcuts hook for the outbound leads table.
//
// Shortcuts (active when a lead row is focused):
//   1-7     → Change outreach status (New..Lost)
//   h/m/l   → Set lead score (High/Medium/Low)
//   f       → Open follow-up date picker
//   r       → Open website review dialog
//   Enter   → Navigate to lead detail page
//   Escape  → Clear selection
//   ?       → Show help modal
// ---------------------------------------------------------------------------

export type ShortcutAction =
  | { type: "status"; value: number }     // 1-7 index into OUTREACH_STATUS_LIST
  | { type: "score"; value: string }       // "High" | "Medium" | "Low"
  | { type: "follow_up" }
  | { type: "review" }
  | { type: "navigate"; leadId: string }
  | { type: "clear_selection" }
  | { type: "show_help" }
  | { type: "copy_email" }
  | { type: "send_email" };

export function useKeyboardShortcuts({
  onAction,
  enabled = true,
}: {
  onAction: (action: ShortcutAction) => void;
  enabled?: boolean;
}) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      // Ignore when a dialog is open
      if (document.querySelector("[role='dialog']")) return;

      if (!enabled) return;

      const key = e.key;

      // Status shortcuts: 1-7
      if (key >= "1" && key <= "7") {
        e.preventDefault();
        onAction({ type: "status", value: parseInt(key) - 1 });
        return;
      }

      // Score shortcuts
      if (key === "h" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "score", value: "High" });
        return;
      }
      if (key === "m" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "score", value: "Medium" });
        return;
      }
      if (key === "l" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "score", value: "Low" });
        return;
      }

      // Other shortcuts
      if (key === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "follow_up" });
        return;
      }
      if (key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "review" });
        return;
      }
      if (key === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "copy_email" });
        return;
      }
      if (key === "s" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onAction({ type: "send_email" });
        return;
      }
      if (key === "Escape") {
        e.preventDefault();
        onAction({ type: "clear_selection" });
        return;
      }
      if (key === "?") {
        e.preventDefault();
        onAction({ type: "show_help" });
        return;
      }
    },
    [onAction, enabled],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler, enabled]);
}
