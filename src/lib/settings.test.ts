import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_SETTINGS,
  isAllowedLogoUrl,
  parsePreferences,
  resolveLocale,
  resolveTheme,
  settingsEqual,
  splitBrandName,
  validateSettingsDraft,
} from "@/lib/settings";

describe("validateSettingsDraft", () => {
  it("accepts defaults", () => {
    expect(validateSettingsDraft(DEFAULT_PUBLIC_SETTINGS)).toEqual({});
  });

  it("rejects empty names, bad logos and unknown locales", () => {
    expect(validateSettingsDraft({ displayName: "  ", logoUrl: "javascript:alert(1)", defaultLocale: "fr" })).toEqual({
      displayName: "El nombre visible es obligatorio.",
      logoUrl: "Usa una URL https o una ruta que empiece por /.",
      defaultLocale: "El idioma no está soportado.",
    });
  });
});

describe("isAllowedLogoUrl", () => {
  it("allows https and same-origin paths", () => {
    expect(isAllowedLogoUrl("https://cdn.example.com/logo.svg")).toBe(true);
    expect(isAllowedLogoUrl("/branding/logo.svg")).toBe(true);
    expect(isAllowedLogoUrl("http://cdn.example.com/logo.svg")).toBe(false);
    expect(isAllowedLogoUrl("//cdn.example.com/logo.svg")).toBe(false);
  });
});

describe("preferences and branding helpers", () => {
  it("parses stored preferences with fallbacks", () => {
    expect(parsePreferences(null)).toEqual({ theme: "system", locale: "", timeZone: "" });
    expect(parsePreferences(`{"theme":"dark","locale":"en","timeZone":"UTC"}`)).toEqual({
      theme: "dark",
      locale: "en",
      timeZone: "UTC",
    });
    expect(parsePreferences("{")).toEqual({ theme: "system", locale: "", timeZone: "" });
  });

  it("resolves theme, locale and brand split", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveLocale({ theme: "system", locale: "", timeZone: "" }, DEFAULT_PUBLIC_SETTINGS)).toBe("es");
    expect(splitBrandName("Acme Console")).toEqual({ lead: "Acme", accent: "Console" });
  });

  it("detects dirty settings", () => {
    expect(settingsEqual(DEFAULT_PUBLIC_SETTINGS, { ...DEFAULT_PUBLIC_SETTINGS, displayName: "Acme" })).toBe(false);
  });
});
