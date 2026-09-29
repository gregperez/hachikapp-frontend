import { describe, expect, it } from "vitest";
import { ENTITY_IDS } from "@/lib/types";
import { adminUser, makeUser, permission } from "@/test/users";
import {
  INTEGRATION_CATALOG,
  INTEGRATION_IDS,
  containsSecrets,
  googleStatusFromProbe,
  healthUrlFromChatEndpoint,
  mastraStatusFromConfig,
  visibleIntegrations,
} from "@/lib/integrations";

describe("visibleIntegrations", () => {
  it("hides the catalog without SETTINGS.read", () => {
    expect(visibleIntegrations(makeUser())).toEqual([]);
  });

  it("shows both real adapters to an admin", () => {
    expect(visibleIntegrations(adminUser()).map((item) => item.id)).toEqual([
      INTEGRATION_IDS.GOOGLE_OIDC,
      INTEGRATION_IDS.MASTRA,
    ]);
  });

  it("shows the catalog to a settings reader", () => {
    const user = makeUser({ permissions: [permission(ENTITY_IDS.SETTINGS, { read: true })] });
    expect(visibleIntegrations(user)).toHaveLength(INTEGRATION_CATALOG.length);
  });
});

describe("status adapters", () => {
  it("maps Google OIDC probe outcomes without requiring secrets", () => {
    expect(googleStatusFromProbe(false)).toBe("degraded");
    expect(googleStatusFromProbe(true, 503)).toBe("not_configured");
    expect(googleStatusFromProbe(true, 400)).toBe("configured");
    expect(googleStatusFromProbe(true, 302)).toBe("configured");
  });

  it("maps Mastra from presence of an endpoint and health", () => {
    expect(mastraStatusFromConfig(undefined, null)).toBe("not_configured");
    expect(mastraStatusFromConfig("http://127.0.0.1:4111/v1/chat", true)).toBe("configured");
    expect(mastraStatusFromConfig("http://127.0.0.1:4111/v1/chat", false)).toBe("degraded");
    expect(healthUrlFromChatEndpoint("http://127.0.0.1:4111/v1/chat")).toBe("http://127.0.0.1:4111/health/live");
  });

  it("detects secret-like fragments so responses can be rejected in tests", () => {
    expect(containsSecrets("sk-live-abc")).toBe(true);
    expect(containsSecrets("Configurada")).toBe(false);
  });
});
