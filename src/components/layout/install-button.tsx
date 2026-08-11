"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install app" button. The browser fires `beforeinstallprompt` when the PWA
 * is installable (manifest + service worker + icons), so this button only
 * appears in browsers that can actually install the app.
 */
export function InstallButton({ className }: { className?: string }) {
  const { t } = useI18n();
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const settled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", settled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", settled);
    };
  }, []);

  if (!deferred) return null;

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className={className}
    >
      <Download className="h-4 w-4" />
      {t("Install app")}
    </Button>
  );
}
