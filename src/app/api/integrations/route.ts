import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  INTEGRATION_CATALOG,
  googleStatusFromProbe,
  healthUrlFromChatEndpoint,
  mastraStatusFromConfig,
  type IntegrationStatus,
  type IntegrationView,
} from "@/lib/integrations";

export const dynamic = "force-dynamic";

async function probeGoogle(): Promise<IntegrationStatus> {
  const backend = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");
  try {
    const response = await fetch(`${backend}/v1/auth/oidc/google/login`, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
    return googleStatusFromProbe(true, response.status);
  } catch {
    return googleStatusFromProbe(false);
  }
}

async function probeMastra(): Promise<IntegrationStatus> {
  const endpoint = process.env.AI_CHAT_ENDPOINT?.trim();
  if (!endpoint) return mastraStatusFromConfig(undefined, null);
  try {
    const health = await fetch(healthUrlFromChatEndpoint(endpoint), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    return mastraStatusFromConfig(endpoint, health.ok);
  } catch {
    return mastraStatusFromConfig(endpoint, false);
  }
}

function actionFor(id: string, status: IntegrationStatus): IntegrationView["action"] {
  if (id === "google-oidc" && status === "configured") {
    return { href: "/login", label: "Probar inicio de sesión" };
  }
  return undefined;
}

export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get("base_access")?.value) {
    return NextResponse.json({ detail: "Debes iniciar sesión." }, { status: 401 });
  }

  const [google, mastra] = await Promise.all([probeGoogle(), probeMastra()]);
  const statuses: Record<string, IntegrationStatus> = {
    "google-oidc": google,
    mastra,
  };
  const items: IntegrationView[] = INTEGRATION_CATALOG.map((item) => ({
    ...item,
    status: statuses[item.id] ?? "unavailable",
    action: actionFor(item.id, statuses[item.id] ?? "unavailable"),
  }));
  return NextResponse.json({ items });
}
