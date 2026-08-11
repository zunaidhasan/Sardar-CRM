"use client";

import * as React from "react";

/**
 * Registers the PWA service worker after the window finishes loading so it
 * never competes with first paint. The worker itself is network-first and
 * dev-safe (see public/sw.js), so registering in development is fine too.
 */
export function PwaRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // registration is best-effort (e.g. unsupported environments)
        });
    };
    // The `load` event can already have fired by the time hydration runs on a
    // fast local page, so check readyState first to avoid missing it.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
