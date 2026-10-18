import { afterEach, describe, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() => ({
  access: "access-jwt" as string | undefined,
  refresh: "refresh-jwt" as string | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "base_access" && cookies.access) return { value: cookies.access };
      if (name === "base_refresh" && cookies.refresh) return { value: cookies.refresh };
      return undefined;
    },
  }),
}));

describe("POST /api/ai/chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    cookies.access = "access-jwt";
    cookies.refresh = "refresh-jwt";
  });

  it("rejects unauthenticated chat", async () => {
    cookies.access = undefined;
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
    }));
    expect(response.status).toBe(401);
  });

  it("returns the preparation payload when Mastra is not configured", async () => {
    vi.stubEnv("AI_CHAT_ENDPOINT", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "user-1", isAdmin: true, permissions: [] } }),
    }));
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
    }));
    const body = await response.json() as { configured: boolean; message: string };
    expect(body.configured).toBe(false);
    expect(JSON.stringify(body)).not.toContain("refresh-jwt");
    expect(JSON.stringify(body)).not.toContain("access-jwt");
  });

  it("pipes SSE and never echoes secrets", async () => {
    vi.stubEnv("AI_CHAT_ENDPOINT", "http://agent.internal:4111/v1/chat");
    vi.stubEnv("AI_CHAT_API_KEY", "sk-live-super-secret");
    vi.stubEnv("ACTOR_CONTEXT_SECRET", "actor-context-secret-32-chars-min");
    const stream = "event: delta\ndata: {\"text\":\"hola\"}\n\nevent: done\ndata: {\"message\":\"hola\"}\n\n";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: "user-1", isAdmin: true, permissions: [] } }),
      })
      .mockResolvedValueOnce(new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
    }));
    expect(response.headers.get("X-Base-Stream")).toBe("v1");
    expect(await response.text()).toContain("event: delta");
    const mastraCall = fetchMock.mock.calls[1];
    const headers = mastraCall[1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer sk-live-super-secret");
    expect(headers.get("X-Actor-Authorization")).toBe("Bearer access-jwt");
    expect(headers.get("X-Actor-Context")).toBeTruthy();
    expect(JSON.stringify(mastraCall[1].body)).not.toContain("refresh-jwt");
    expect(JSON.stringify(mastraCall[1].body)).not.toContain("sk-live");
  });
});
