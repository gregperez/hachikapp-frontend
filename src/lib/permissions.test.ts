import { describe, expect, it } from "vitest";
import { canAccess, isFeatureEnabled } from "@/lib/permissions";
import { ENTITY_IDS, type PermissionAction, type PermissionRequirement } from "@/lib/types";
import { adminUser, makeUser, permission } from "@/test/users";

const usersRead: PermissionRequirement = { entity: ENTITY_IDS.USERS, action: "read" };

describe("canAccess", () => {
  it.each([
    { action: "create", granted: { create: true } },
    { action: "read", granted: { read: true } },
    { action: "update", granted: { update: true } },
    { action: "delete", granted: { delete: true } },
  ] satisfies Array<{ action: PermissionAction; granted: Partial<Record<PermissionAction, boolean>> }>)(
    "allows $action when the matching flag is true",
    ({ action, granted }) => {
      const user = makeUser({ permissions: [permission(ENTITY_IDS.USERS, granted)] });
      expect(canAccess(user, { entity: ENTITY_IDS.USERS, action })).toBe(true);
    },
  );

  it("denies an action that is not granted on the entity", () => {
    const user = makeUser({ permissions: [permission(ENTITY_IDS.USERS, { read: true })] });
    expect(canAccess(user, { entity: ENTITY_IDS.USERS, action: "create" })).toBe(false);
  });

  it("denies when the entity is missing", () => {
    const user = makeUser({ permissions: [permission(ENTITY_IDS.USERS, { read: true })] });
    expect(canAccess(user, { entity: ENTITY_IDS.ROLES, action: "read" })).toBe(false);
  });

  it("denies a null user", () => {
    expect(canAccess(null, usersRead)).toBe(false);
    expect(canAccess(undefined, usersRead)).toBe(false);
  });

  it("lets isAdmin bypass a missing permission", () => {
    expect(canAccess(adminUser({ permissions: [] }), { entity: ENTITY_IDS.ROLES, action: "delete" })).toBe(true);
  });

  it("allows an authenticated user when no requirement is declared", () => {
    expect(canAccess(makeUser(), undefined)).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  it("treats an omitted flag as enabled", () => {
    expect(isFeatureEnabled()).toBe(true);
  });

  it("hides a flagged module unless the public env is true", () => {
    const key = "NEXT_PUBLIC_FEATURE_demo";
    const previous = process.env[key];
    process.env[key] = "false";
    expect(isFeatureEnabled("demo")).toBe(false);
    process.env[key] = "true";
    expect(isFeatureEnabled("demo")).toBe(true);
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  });
});
