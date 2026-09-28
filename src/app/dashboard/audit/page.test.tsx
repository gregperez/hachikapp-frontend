import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";
import { adminUser, makeUser, permission } from "@/test/users";
import { ENTITY_IDS } from "@/lib/types";

const session = vi.hoisted(() => ({
  user: null as User | null,
  api: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => ({ user: session.user }),
}));

vi.mock("@/lib/api", () => ({
  api: session.api,
  dataOf: <T,>(envelope: { data: T }) => envelope.data,
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : "error"),
}));

import AuditPage from "./page";

describe("AuditPage", () => {
  beforeEach(() => {
    session.user = null;
    session.api.mockReset();
  });

  it("does not fetch or list events without AUDIT_EVENTS.read", () => {
    session.user = makeUser();
    render(<AuditPage />);
    expect(screen.getByText("No tienes permiso para consultar el registro de auditoría.")).toBeInTheDocument();
    expect(session.api).not.toHaveBeenCalled();
  });

  it("loads events when the user can read audit", async () => {
    session.user = makeUser({ permissions: [permission(ENTITY_IDS.AUDIT_EVENTS, { read: true })] });
    session.api.mockResolvedValue({
      status: 200,
      message: "Ok",
      data: {
        data: [{
          id: "11111111-1111-1111-1111-111111111111",
          occurredAt: "2026-09-28T18:00:00Z",
          category: "privilege",
          action: "assign_roles",
          outcome: "success",
          actorId: "actor-1",
          subjectType: "user",
          subjectId: "subject-1",
        }],
        limit: 20,
        hasNext: false,
      },
    });
    render(<AuditPage />);
    expect(await screen.findByText("assign_roles")).toBeInTheDocument();
    expect(session.api).toHaveBeenCalled();
  });

  it("shows the module to an administrator", async () => {
    session.user = adminUser();
    session.api.mockResolvedValue({ status: 200, message: "Ok", data: { data: [], limit: 20, hasNext: false } });
    render(<AuditPage />);
    expect(await screen.findByText("No hay eventos para estos filtros.")).toBeInTheDocument();
  });
});
