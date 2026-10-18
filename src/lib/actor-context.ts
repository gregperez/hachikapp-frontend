import { createHmac, randomBytes } from "node:crypto";
import type { Permission, User } from "@/lib/types";

export type ActorClaims = {
  sub: string;
  exp: number;
  nonce: string;
  requestId: string;
  permissions: string[];
};

const AUDIENCE = "base-agent";

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function permissionKeys(user: Pick<User, "isAdmin" | "permissions">): string[] {
  if (user.isAdmin) return ["ROLES:read"];
  const keys: string[] = [];
  for (const permission of user.permissions ?? []) {
    for (const action of ["create", "read", "update", "delete"] as const) {
      if (permission[action as keyof Permission]) keys.push(`${permission.entity}:${action}`);
    }
  }
  return keys;
}

export function signActorContext(claims: ActorClaims, secret: string): string {
  const encoded = b64url(JSON.stringify({ ...claims, aud: AUDIENCE }));
  const sig = createHmac("sha256", secret).update(encoded).digest();
  return `${encoded}.${b64url(sig)}`;
}

export function newActorContext(user: Pick<User, "id" | "isAdmin" | "permissions">, requestId: string, now = Date.now()): ActorClaims {
  return {
    sub: user.id,
    exp: Math.floor(now / 1000) + 5 * 60,
    nonce: randomBytes(16).toString("hex"),
    requestId,
    permissions: permissionKeys(user),
  };
}
