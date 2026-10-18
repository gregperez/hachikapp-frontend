import { afterEach, describe, expect, it, vi } from "vitest";
import { containsSecrets } from "@/lib/integrations";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "base_access" ? { value: "session" } : undefined),
  }),
}));

describe("GET /api/integrations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns sanitized statuses and never echoes secrets", async () => {
    vi.stubEnv("BACKEND_URL", "http://api.internal:8080");
    vi.stubEnv("AI_CHAT_ENDPOINT", "http://agent.internal:4111/v1/chat");
    vi.stubEnv("AI_CHAT_API_KEY", "sk-live-super-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 400, ok: false })
      .mockResolvedValueOnce({ status: 200, ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json() as { items: Array<{ id: string; status: string }> };
    const serialized = JSON.stringify(body);
    expect(body.items.map((item) => item.id)).toEqual(["google-oidc", "mastra"]);
    expect(body.items.find((item) => item.id === "google-oidc")?.status).toBe("configured");
    expect(body.items.find((item) => item.id === "mastra")?.status).toBe("configured");
    expect(containsSecrets(serialized)).toBe(false);
    expect(serialized).not.toContain("sk-live");
    expect(serialized).not.toContain("agent.internal");
    expect(serialized).not.toContain("api.internal");
  });
});
