"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import {
  I18N_COOKIE_NAME,
  I18N_STORAGE_KEY,
  detectLocale,
  translate,
  type Locale,
} from "@/lib/i18n";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate an English source string; falls back to English when missing. */
  t: (en: string) => string;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

/**
 * Client language provider.
 *
 * `initialLocale` is the locale the SERVER rendered with (read from the
 * sardar-locale cookie in the root layout). The provider starts on exactly
 * that value so the client's first render matches the server HTML — no
 * hydration mismatches and no English flash for saved Bengali users. After
 * mount it syncs from localStorage (the user's source of truth) and updates
 * both the cookie and <html lang>.
 */
export function I18nProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  useEffect(() => {
    let stored: Locale | null = null;
    try {
      const v = localStorage.getItem(I18N_STORAGE_KEY);
      if (v === "en" || v === "bn") stored = v;
    } catch {
      // storage unavailable (private mode)
    }
    const next = stored ?? detectLocale(typeof navigator !== "undefined" ? navigator.language : null);
    setLocaleState(next);
    document.documentElement.lang = next;
    // If the storage/navigator locale differs from what the server rendered
    // (e.g. the cookie was cleared but localStorage survived), persist the
    // resolved locale as a cookie so future server renders match it — no
    // English flash and no re-switch on the next navigation.
    if (next !== initialLocale) {
      try {
        document.cookie = `${I18N_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // cookie write unavailable — the localStorage value still applies
      }
    }
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(I18N_STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode) — still switch for this session
    }
    try {
      // Persist server-side too so future server renders match the choice
      // (no English flash, no hydration mismatch on next navigation).
      document.cookie = `${I18N_COOKIE_NAME}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // cookie write unavailable — the localStorage value still applies
    }
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nState>(
    () => ({ locale, setLocale, t: (en: string) => translate(locale, en) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
