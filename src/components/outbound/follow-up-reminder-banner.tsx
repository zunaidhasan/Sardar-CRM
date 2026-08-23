"use client";

import * as React from "react";
import { Bell, BellOff, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useFollowUpReminders } from "@/hooks/use-follow-up-reminders";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

// ---------------------------------------------------------------------------
// Follow-up Reminder Banner
//
// Shows a banner at the top of the outbound leads page when there are
// overdue or today's follow-ups. Allows enabling browser notifications.
// ---------------------------------------------------------------------------

export function FollowUpReminderBanner({ leads }: { leads: Client[] }) {
  const { overdueCount, permissionGranted, requestPermission } = useFollowUpReminders(leads);

  if (overdueCount === 0) return null;

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  return (
    <Card className={cn(
      "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
      overdueCount === 0 && "hidden"
    )}>
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {overdueCount} follow-up{overdueCount > 1 ? "s" : ""} due
            </p>
            <p className="text-xs text-muted-foreground">
              You have overdue or upcoming follow-ups that need attention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!permissionGranted && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableNotifications}
              className="gap-1.5"
            >
              <Bell className="h-3.5 w-3.5" />
              Enable Alerts
            </Button>
          )}
          {permissionGranted && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
              <Bell className="mr-1 h-3 w-3" />
              Alerts ON
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Push Notification Status Component
//
// Shows the current push notification subscription status and allows
// managing subscriptions for mobile PWA notifications.
// ---------------------------------------------------------------------------

export function PushNotificationStatus() {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function checkSubscription() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setLoading(false);
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch {
        // Ignore errors
      }
      setLoading(false);
    }
    checkSubscription();
  }, []);

  const toggleSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        await subscription?.unsubscribe();
        setIsSubscribed(false);
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setLoading(false);
          return;
        }

        // In production, you'd use a real VAPID public key
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
        });

        // Send subscription to server
        await fetch("/api/v1/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        }).catch(() => {
          // Best-effort: subscription works locally even without server storage
        });

        setIsSubscribed(true);
      }
    } catch {
      // Ignore errors
    }
    setLoading(false);
  };

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSubscription}
        disabled={loading}
        className="gap-1.5"
      >
        {isSubscribed ? (
          <>
            <Bell className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs">Push ON</span>
          </>
        ) : (
          <>
            <BellOff className="h-3.5 w-3.5" />
            <span className="text-xs">Push OFF</span>
          </>
        )}
      </Button>
    </div>
  );
}
