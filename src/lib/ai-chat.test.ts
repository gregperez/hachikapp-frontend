import { describe, expect, it } from "vitest";
import { mastraChatHeaders, sessionUserFromEnvelope } from "@/lib/ai-chat";

describe("mastra chat BFF helpers", () => {
  it("forwards service and actor credentials without a refresh token", () => {
    const headers = mastraChatHeaders({
      serviceToken: "service-token-16",
      actorContext: "actor.hmac",
      accessToken: "access-jwt",
      requestId: "req-1",
    });
    expect(headers.get("Authorization")).toBe("Bearer service-token-16");
    expect(headers.get("X-Actor-Authorization")).toBe("Bearer access-jwt");
    expect(headers.get("X-Base-Stream")).toBe("v1");
    const serialized = JSON.stringify(Object.fromEntries(headers.entries()));
    expect(serialized).not.toContain("refresh");
    expect(serialized).not.toContain("base_refresh");
  });

  it("reads the session user from the Go envelope", () => {
    expect(sessionUserFromEnvelope({ data: { id: "user-1", isAdmin: true, permissions: [] } })?.id).toBe("user-1");
    expect(sessionUserFromEnvelope({})).toBeNull();
  });
});
