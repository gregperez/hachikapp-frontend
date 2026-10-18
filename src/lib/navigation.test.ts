import { describe, expect, it } from "vitest";
import {
  NAV_SECTIONS,
  canSeeNavItem,
  isLinkActive,
  visibleNavSections,
  type NavItem,
} from "@/lib/navigation";
import { ENTITY_IDS } from "@/lib/types";
import { adminUser, makeUser, permission, usersReader } from "@/test/users";

function itemById(id: string): NavItem {
  const item = NAV_SECTIONS.flatMap((section) => section.items).find((entry) => entry.id === id);
  if (!item) throw new Error(`missing nav item ${id}`);
  return item;
}

describe("visibleNavSections", () => {
  it("hides empty administrative sections for a user without modules", () => {
    const sections = visibleNavSections(makeUser());
    expect(sections.map((section) => section.id)).toEqual(["home", "intelligence"]);
    expect(sections.find((section) => section.id === "admin")).toBeUndefined();
  });

  it("shows only the granted administrative links", () => {
    const admin = visibleNavSections(usersReader()).find((section) => section.id === "admin");
    expect(admin?.items.map((item) => item.id)).toEqual(["users"]);
  });

  it("shows every administrative link to an admin", () => {
    const admin = visibleNavSections(adminUser()).find((section) => section.id === "admin");
    expect(admin?.items.map((item) => item.id)).toEqual(["users", "roles", "audit", "settings-general", "settings-integrations"]);
  });
});

describe("canSeeNavItem", () => {
  it("keeps the dashboard visible without an administrative permission", () => {
    expect(canSeeNavItem(makeUser(), itemById("dashboard"))).toBe(true);
  });

  it("shows the pets section to every signed-in user", () => {
    expect(canSeeNavItem(makeUser(), itemById("pets"))).toBe(true);
    expect(isLinkActive("/dashboard/pets/123/edit", "/dashboard/pets")).toBe(true);
  });

  it("hides roles without ROLES.read", () => {
    expect(canSeeNavItem(usersReader(), itemById("roles"))).toBe(false);
    expect(canSeeNavItem(
      makeUser({ permissions: [permission(ENTITY_IDS.ROLES, { read: true })] }),
      itemById("roles"),
    )).toBe(true);
  });

  it("hides audit without AUDIT_EVENTS.read", () => {
    expect(canSeeNavItem(usersReader(), itemById("audit"))).toBe(false);
    expect(canSeeNavItem(
      makeUser({ permissions: [permission(ENTITY_IDS.AUDIT_EVENTS, { read: true })] }),
      itemById("audit"),
    )).toBe(true);
  });

  it("hides settings without SETTINGS.read", () => {
    expect(canSeeNavItem(usersReader(), itemById("settings-general"))).toBe(false);
    expect(canSeeNavItem(
      makeUser({ permissions: [permission(ENTITY_IDS.SETTINGS, { read: true })] }),
      itemById("settings-general"),
    )).toBe(true);
  });
});

describe("isLinkActive", () => {
  it("treats the dashboard as an exact match", () => {
    expect(isLinkActive("/dashboard", "/dashboard")).toBe(true);
    expect(isLinkActive("/dashboard/users", "/dashboard")).toBe(false);
  });

  it("marks nested administrative routes as active", () => {
    expect(isLinkActive("/dashboard/users", "/dashboard/users")).toBe(true);
  });
});
