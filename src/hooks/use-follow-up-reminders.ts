"use client";

import * as React from "react";
import {
  requestNotificationPermission,
  checkAndNotify,
  findOverdueLeads,
} from "@/lib/follow-up-reminders";
import type { Client } from "@/lib/types";

// ---------------------------------------------------------------------------
// useFollowUpReminders
//
// Periodically checks for overdue follow-ups and shows browser notifications.
// Runs every 30 minutes when the tab is active.
// ---------------------------------------------------------------------------

export function useFollowUpReminders(leads: Client[]) {
  const [overdueCount, setOverdueCount] = React.useState(0);
  const [permissionGranted, setPermissionGranted] = React.useState(false);

  // Check permission on mount
  React.useEffect(() => {
    if ("Notification" in window) {
      setPermissionGranted(Notification.permission === "granted");
    }
  }, []);

  // Request permission
  const requestPermission = React.useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    return granted;
  }, []);

  // Check for overdue leads
  React.useEffect(() => {
    const overdue = findOverdueLeads(leads);
    setOverdueCount(overdue.length);
  }, [leads]);

  // Periodic notification check (every 30 minutes)
  React.useEffect(() => {
    if (!permissionGranted) return;

    // Initial check
    checkAndNotify(leads);

    const interval = setInterval(() => {
      checkAndNotify(leads);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [leads, permissionGranted]);

  return {
    overdueCount,
    permissionGranted,
    requestPermission,
  };
}
