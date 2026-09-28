"use client";

import { api, dataOf } from "@/lib/api";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PUBLIC_SETTINGS,
  PREFERENCES_STORAGE_KEY,
  parsePreferences,
  resolveLocale,
  resolveTheme,
} from "@/lib/settings";
import type { ApiEnvelope, PersonalPreferences, PublicSettings } from "@/lib/types";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type SettingsContextValue = {
  settings: PublicSettings;
  preferences: PersonalPreferences;
  source: "remote" | "fallback";
  loading: boolean;
  refresh: () => Promise<void>;
  savePreferences: (next: PersonalPreferences) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [source, setSource] = useState<"remote" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<PersonalPreferences>(DEFAULT_PREFERENCES);
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    setPreferences(parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const envelope = await api<ApiEnvelope<PublicSettings>>("v1/settings/public");
      setSettings({ ...DEFAULT_PUBLIC_SETTINGS, ...dataOf(envelope) });
      setSource("remote");
    } catch {
      setSettings(DEFAULT_PUBLIC_SETTINGS);
      setSource("fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreferences = useCallback((next: PersonalPreferences) => {
    setPreferences(next);
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const theme = resolveTheme(preferences.theme, prefersDark);
    const locale = resolveLocale(preferences, settings);
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
    document.title = settings.displayName;
  }, [preferences, prefersDark, settings]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    preferences,
    source,
    loading,
    refresh,
    savePreferences,
  }), [settings, preferences, source, loading, refresh, savePreferences]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
