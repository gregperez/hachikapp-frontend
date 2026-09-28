export type Permission = {
  entity: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
};

export type Role = {
  id: string;
  name: string;
  active: boolean;
  routes: Array<"USERS" | "ROLES">;
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
