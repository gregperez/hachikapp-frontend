import type { AppSettings, PersonalPreferences, PublicSettings, ThemePreference } from "@/lib/types";

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  displayName: "Hachikapp",
  logoUrl: "",
  defaultLocale: "es",
};

export const ALLOWED_LOCALES = ["es", "en", "es-CL", "en-US"] as const;

export const DEFAULT_PREFERENCES: PersonalPreferences = {
  theme: "system",
  locale: "",
  timeZone: "",
};

export const PREFERENCES_STORAGE_KEY = "base-console.preferences";

export function emptyAppSettings(): AppSettings {
  return { ...DEFAULT_PUBLIC_SETTINGS, version: 1 };
}

export function settingsEqual(a: Pick<AppSettings, "displayName" | "logoUrl" | "defaultLocale">, b: Pick<AppSettings, "displayName" | "logoUrl" | "defaultLocale">): boolean {
  return a.displayName === b.displayName && a.logoUrl === b.logoUrl && a.defaultLocale === b.defaultLocale;
}

export function isAllowedLocale(locale: string): boolean {
  return (ALLOWED_LOCALES as readonly string[]).includes(locale);
}

export function isAllowedLogoUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  if (trimmed.startsWith("/")) {
    return !trimmed.startsWith("//");
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSettingsDraft(draft: Pick<AppSettings, "displayName" | "logoUrl" | "defaultLocale">): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = draft.displayName.trim();
  if (!name) errors.displayName = "El nombre visible es obligatorio.";
  else if (name.length > 80) errors.displayName = "El nombre no puede superar 80 caracteres.";
  if (!isAllowedLogoUrl(draft.logoUrl)) errors.logoUrl = "Usa una URL https o una ruta que empiece por /.";
  if (!isAllowedLocale(draft.defaultLocale)) errors.defaultLocale = "El idioma no está soportado.";
  return errors;
}

export function parsePreferences(raw: string | null): PersonalPreferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<PersonalPreferences>;
    const theme: ThemePreference = parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
      ? parsed.theme
      : "system";
    const locale = typeof parsed.locale === "string" && (parsed.locale === "" || isAllowedLocale(parsed.locale))
      ? parsed.locale
      : "";
    const timeZone = typeof parsed.timeZone === "string" ? parsed.timeZone : "";
    return { theme, locale, timeZone };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): "light" | "dark" {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function resolveLocale(preferences: PersonalPreferences, settings: PublicSettings): string {
  return preferences.locale || settings.defaultLocale || DEFAULT_PUBLIC_SETTINGS.defaultLocale;
}

export function splitBrandName(name: string): { lead: string; accent: string } {
  const trimmed = name.trim() || DEFAULT_PUBLIC_SETTINGS.displayName;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { lead: parts[0], accent: "" };
  return { lead: parts.slice(0, -1).join(" "), accent: parts.at(-1) || "" };
}
