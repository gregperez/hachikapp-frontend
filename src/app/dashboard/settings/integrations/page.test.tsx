import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";
import { adminUser, makeUser, permission } from "@/test/users";
import { ENTITY_IDS } from "@/lib/types";

const session = vi.hoisted(() => ({
  user: null as User | null,
  fetch: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => ({ user: session.user }),
}));

import IntegrationsPage from "./page";

describe("IntegrationsPage", () => {
  beforeEach(() => {
    session.user = null;
    session.fetch.mockReset();
    vi.stubGlobal("fetch", session.fetch);
  });

  it("does not fetch without SETTINGS.read", () => {
    session.user = makeUser();
    render(<IntegrationsPage />);
    expect(screen.getByText("No tienes permiso para consultar las integraciones.")).toBeInTheDocument();
    expect(session.fetch).not.toHaveBeenCalled();
  });

  it("renders sanitized Google and Mastra cards", async () => {
    session.user = adminUser();
    session.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: "google-oidc", name: "Google OIDC", description: "Federated login", category: "identity", documentationHref: "https://example.com/oidc", status: "configured" },
          { id: "mastra", name: "Asistente Mastra", description: "Independent API", category: "intelligence", documentationHref: "https://mastra.ai/docs", status: "not_configured" },
        ],
      }),
    });
    render(<IntegrationsPage />);
    expect(await screen.findByText("Google OIDC")).toBeInTheDocument();
    expect(screen.getByText("Asistente Mastra")).toBeInTheDocument();
    expect(screen.getByText("Configurada")).toBeInTheDocument();
    expect(screen.getByText("Sin configurar")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("sk-");
    expect(document.body.textContent).not.toContain("AI_CHAT_API_KEY");
  });

  it("shows an empty state when the filtered catalog has no cards", async () => {
    session.user = makeUser({ permissions: [permission(ENTITY_IDS.SETTINGS, { read: true })] });
    session.fetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    render(<IntegrationsPage />);
    expect(await screen.findByText("No hay integraciones visibles para tu cuenta.")).toBeInTheDocument();
  });
});
