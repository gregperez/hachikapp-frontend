import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { newActorContext, permissionKeys, signActorContext } from "@/lib/actor-context";
import { adminUser, makeUser, permission } from "@/test/users";
import { ENTITY_IDS } from "@/lib/types";

describe("actor context", () => {
  it("signs an HMAC token with audience base-agent", () => {
    const claims = newActorContext(adminUser({ id: "user-9" }), "req-1", 1_700_000_000_000);
    expect(claims.sub).toBe("user-9");
    expect(claims.permissions).toEqual(["ROLES:read"]);
    expect(claims.exp).toBe(1_700_000_000 + 300);
    const token = signActorContext(claims, "actor-context-secret-32-chars-min");
    const [encoded, sig] = token.split(".");
    const expected = createHmac("sha256", "actor-context-secret-32-chars-min").update(encoded).digest("base64url");
    expect(sig).toBe(expected);
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as { aud: string };
    expect(payload.aud).toBe("base-agent");
  });

  it("maps granted permissions and never includes a refresh token", () => {
    const keys = permissionKeys(makeUser({
      permissions: [permission(ENTITY_IDS.ROLES, { read: true, update: true })],
    }));
    expect(keys).toEqual(["ROLES:read", "ROLES:update"]);
    expect(JSON.stringify(keys)).not.toContain("refresh");
  });
});
