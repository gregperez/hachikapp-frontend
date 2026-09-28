import type { AuditFilters } from "@/lib/types";

const ALLOWED_ACTIONS = new Set([
  "login_success",
  "login_failure",
  "refresh_success",
  "refresh_replay",
  "family_revoke",
  "user_revoke",
  "token_reject",
  "key_rotation",
  "oidc_start",
  "oidc_success",
  "oidc_failure",
  "oidc_link",
  "oidc_conflict",
  "assign_roles",
  "set_admin_flag",
  "set_active",
]);

const ALLOWED_OUTCOMES = new Set(["success", "failure"]);

function compact(value: string): string {
  return value.trim();
}

export function buildAuditQuery(filters: AuditFilters, limit: number, cursor?: string): string {
  const params = new URLSearchParams({ limit: String(limit) });
  const action = compact(filters.action);
  const outcome = compact(filters.outcome);
  const actorId = compact(filters.actorId);
  const subjectId = compact(filters.subjectId);
  const from = compact(filters.from);
  const to = compact(filters.to);
  if (action && ALLOWED_ACTIONS.has(action)) params.set("action", action);
  if (outcome && ALLOWED_OUTCOMES.has(outcome)) params.set("outcome", outcome);
  if (actorId) params.set("actorId", actorId);
  if (subjectId) params.set("subjectId", subjectId);
  if (from) params.set("from", toQueryTime(from));
  if (to) params.set("to", toQueryTime(to));
  if (cursor) params.set("cursor", cursor);
  return `v1/audit-events?${params}`;
}

export const AUDIT_ACTION_OPTIONS = [...ALLOWED_ACTIONS];

function toQueryTime(value: string): string {
  if (value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}
