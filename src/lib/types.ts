export const ENTITY_IDS = {
  USERS: "USERS",
  ROLES: "ROLES",
  USERS_PRIVILEGES: "USERS_PRIVILEGES",
  AUDIT_EVENTS: "AUDIT_EVENTS",
} as const;

export type EntityId = (typeof ENTITY_IDS)[keyof typeof ENTITY_IDS];
export type RouteId = EntityId;

export const PERMISSION_ACTIONS = ["create", "read", "update", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionRequirement = {
  entity: EntityId;
  action: PermissionAction;
};

export type Permission = {
  entity: EntityId;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

export type Role = {
  id: string;
  name: string;
  active: boolean;
  routes: RouteId[];
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  isAdmin: boolean;
  roles: Role[];
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
};

export type Session = {
  familyId: string;
  current: boolean;
  issuedAt: string;
  lastSeenAt: string;
  expiresAt: string;
  clientLabel: string;
  ipPrefix?: string;
};

export type AuditEvent = {
  id: string;
  occurredAt: string;
  category: string;
  action: string;
  outcome: string;
  actorId: string;
  subjectType: string;
  subjectId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditFilters = {
  action: string;
  outcome: string;
  actorId: string;
  subjectId: string;
  from: string;
  to: string;
};

export type CursorPage<T> = {
  data: T[];
  limit: number;
  hasNext: boolean;
  nextCursor?: string;
};

export type ApiEnvelope<T> = {
  status: number;
  message: string;
  data: T;
};

export type ApiProblem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  requestId?: string;
  errors?: Array<{ field: string; code: string }>;
};
