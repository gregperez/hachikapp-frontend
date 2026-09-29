import { canAccess, isFeatureEnabled } from "@/lib/permissions";
import { ENTITY_IDS, type PermissionRequirement, type User } from "@/lib/types";

export const INTEGRATION_STATUSES = ["unavailable", "not_configured", "configured", "degraded"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const INTEGRATION_IDS = {
  GOOGLE_OIDC: "google-oidc",
  MASTRA: "mastra",
} as const;

export type IntegrationId = (typeof INTEGRATION_IDS)[keyof typeof INTEGRATION_IDS];

export type IntegrationDefinition = {
  id: IntegrationId;
  name: string;
  description: string;
  category: "identity" | "intelligence";
  documentationHref: string;
  requiredPermission?: PermissionRequirement;
  featureFlag?: string;
};

export type IntegrationView = IntegrationDefinition & {
  status: IntegrationStatus;
  action?: { href: string; label: string };
};

export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    id: INTEGRATION_IDS.GOOGLE_OIDC,
    name: "Google OIDC",
    description: "Inicio de sesión federado con Google. Los secretos del cliente viven en el API, no en el navegador.",
    category: "identity",
    documentationHref: "https://developers.google.com/identity/protocols/oauth2",
    requiredPermission: { entity: ENTITY_IDS.SETTINGS, action: "read" },
  },
  {
    id: INTEGRATION_IDS.MASTRA,
    name: "Asistente Mastra",
    description: "API de agentes independiente. El navegador nunca recibe la clave del modelo ni la credencial de servicio.",
    category: "intelligence",
    documentationHref: "https://mastra.ai/docs",
    requiredPermission: { entity: ENTITY_IDS.SETTINGS, action: "read" },
  },
];

export function visibleIntegrations(
  user: User | null | undefined,
  catalog: IntegrationDefinition[] = INTEGRATION_CATALOG,
): IntegrationDefinition[] {
  return catalog.filter((item) => {
    if (!isFeatureEnabled(item.featureFlag)) return false;
    return canAccess(user, item.requiredPermission);
  });
}

export function googleStatusFromProbe(reachable: boolean, httpStatus?: number): IntegrationStatus {
  if (!reachable) return "degraded";
  if (httpStatus === 503) return "not_configured";
  if (httpStatus === 404) return "unavailable";
  if (httpStatus === 400 || httpStatus === 302 || httpStatus === 429 || httpStatus === 401) return "configured";
  if (httpStatus && httpStatus >= 500) return "degraded";
  return "degraded";
}

export function mastraStatusFromConfig(endpoint: string | undefined, healthOk: boolean | null): IntegrationStatus {
  if (!endpoint?.trim()) return "not_configured";
  if (healthOk === true) return "configured";
  if (healthOk === false) return "degraded";
  return "configured";
}

export function healthUrlFromChatEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  return `${url.origin}/health/live`;
}

export function statusLabel(status: IntegrationStatus): string {
  switch (status) {
    case "configured":
      return "Configurada";
    case "not_configured":
      return "Sin configurar";
    case "degraded":
      return "Degradada";
    default:
      return "No disponible";
  }
}

const SECRET_NEEDLES = ["sk-", "Bearer ", "postgres://", "eyJ", "API_KEY", "CLIENT_SECRET"];

export function containsSecrets(value: string): boolean {
  const lower = value.toLowerCase();
  return SECRET_NEEDLES.some((needle) => lower.includes(needle.toLowerCase()));
}
