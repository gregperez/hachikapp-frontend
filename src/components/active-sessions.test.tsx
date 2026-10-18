import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/types";

const apiMock = vi.hoisted(() => ({
  api: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: apiMock.api,
  dataOf: <T,>(envelope: { data: T }) => envelope.data,
  errorMessage: (error: unknown) => (error instanceof Error ? error.message : "error"),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => ({ logout: apiMock.logout }),
}));

import { ActiveSessions } from "./active-sessions";

const current: Session = {
  familyId: "family-current",
  current: true,
  issuedAt: "2026-09-28T12:00:00Z",
  lastSeenAt: "2026-09-28T15:00:00Z",
  expiresAt: "2026-10-05T12:00:00Z",
  clientLabel: "Mozilla/5.0",
  ipPrefix: "192.168.1.0",
};

const other: Session = {
  ...current,
  familyId: "family-other",
  current: false,
  clientLabel: "Safari",
};

describe("ActiveSessions", () => {
  beforeEach(() => {
    apiMock.api.mockReset();
    apiMock.logout.mockReset();
  });

  it("renders loading then the current session label", async () => {
    apiMock.api.mockResolvedValue({ status: 200, message: "Ok", data: { data: [current, other], limit: 20, hasNext: false } });
    render(<ActiveSessions />);
    expect(screen.getByText("Cargando información…")).toBeInTheDocument();
    expect(await screen.findByText("Esta sesión")).toBeInTheDocument();
    expect(screen.getByText("Safari")).toBeInTheDocument();
  });

  it("shows an empty state when there are no sessions", async () => {
    apiMock.api.mockResolvedValue({ status: 200, message: "Ok", data: { data: [], limit: 20, hasNext: false } });
    render(<ActiveSessions />);
    expect(await screen.findByText("No hay sesiones activas.")).toBeInTheDocument();
  });

  it("shows a recoverable error", async () => {
    apiMock.api.mockRejectedValue(new Error("Backend no disponible"));
    render(<ActiveSessions />);
    expect(await screen.findByText("Backend no disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("confirms revoking another session without logging out", async () => {
    const events = userEvent.setup();
    apiMock.api
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { data: [current, other], limit: 20, hasNext: false } })
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { revokedCurrent: false } })
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { data: [current], limit: 20, hasNext: false } });
    render(<ActiveSessions />);
    await screen.findByText("Safari");
    await events.click(screen.getByRole("button", { name: "Cerrar" }));
    await events.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(apiMock.api).toHaveBeenCalledWith("v1/users/me/sessions/family-other", { method: "DELETE" });
    expect(apiMock.logout).not.toHaveBeenCalled();
    expect(await screen.findByText("La sesión fue cerrada.")).toBeInTheDocument();
  });

  it("logs the user out after revoking the current session", async () => {
    const events = userEvent.setup();
    apiMock.api
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { data: [current], limit: 20, hasNext: false } })
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { revokedCurrent: true } });
    render(<ActiveSessions />);
    await screen.findByText("Esta sesión");
    await events.click(screen.getByRole("button", { name: "Cerrar esta sesión" }));
    await events.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(apiMock.logout).toHaveBeenCalledTimes(1);
  });
});
