import type { PermissionAction, PermissionRequirement, User } from "@/lib/types";

export function isFeatureEnabled(flag?: string): boolean {
  if (!flag) return true;
  return process.env[`NEXT_PUBLIC_FEATURE_${flag}`] === "true";
}

export function canAccess(
  user: User | null | undefined,
  requirement?: PermissionRequirement,
): boolean {
  if (!user) return false;
  if (!requirement) return true;
  if (user.isAdmin) return true;

  const permission = user.permissions?.find((item) => item.entity === requirement.entity);
  if (!permission) return false;

  const action: PermissionAction = requirement.action;
  return Boolean(permission[action]);
}
