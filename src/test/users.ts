import { ENTITY_IDS, type EntityId, type Permission, type PermissionAction, type User } from "@/lib/types";

export function permission(
  entity: EntityId,
  actions: Partial<Record<PermissionAction, boolean>> = {},
): Permission {
  return {
    entity,
    create: false,
    read: false,
    update: false,
    delete: false,
    ...actions,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    active: true,
    isAdmin: false,
    roles: [],
    permissions: [],
    ...overrides,
  };
}

export function adminUser(overrides: Partial<User> = {}): User {
  return makeUser({ name: "Admin", email: "admin@example.com", isAdmin: true, ...overrides });
}

export function usersReader(): User {
  return makeUser({
    name: "Lector",
    permissions: [permission(ENTITY_IDS.USERS, { read: true })],
  });
}

export { ENTITY_IDS };
