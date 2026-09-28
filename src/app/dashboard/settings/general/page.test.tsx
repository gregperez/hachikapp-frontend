import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { ENTITY_IDS, type User } from "@/lib/types";
import { adminUser, makeUser, permission } from "@/test/users";

const session = vi.hoisted(() => ({
  user: null as User | null,
  api: vi.fn(),
  refreshBranding: vi.fn(),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => ({ user: session.user }),
}));

vi.mock("@/components/settings-provider", () => ({
  useSettings: () => ({ refresh: session.refreshBranding }),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    api: session.api,
  };
});

import GeneralSettingsPage from "./page";

const remoteSettings = {
  displayName: "Acme Console",
  logoUrl: "",
  defaultLocale: "en",
  version: 3,
};

describe("GeneralSettingsPage", () => {
  beforeEach(() => {
    session.user = null;
    session.api.mockReset();
    session.refreshBranding.mockReset();
  });

  it("does not fetch without SETTINGS.read", () => {
    session.user = makeUser();
    render(<GeneralSettingsPage />);
    expect(screen.getByText("No tienes permiso para consultar la configuración general.")).toBeInTheDocument();
    expect(session.api).not.toHaveBeenCalled();
  });

  it("renders remote values for a reader", async () => {
    session.user = makeUser({ permissions: [permission(ENTITY_IDS.SETTINGS, { read: true })] });
    session.api.mockResolvedValue({ status: 200, message: "Ok", data: remoteSettings });
    render(<GeneralSettingsPage />);
    expect(await screen.findByDisplayValue("Acme Console")).toBeInTheDocument();
    expect(screen.getByText("Versión 3. Un conflicto 409 recarga el formulario.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });

  it("saves an update when the user can write", async () => {
    const user = userEvent.setup();
    session.user = adminUser();
    session.api
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: remoteSettings })
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { ...remoteSettings, displayName: "Nueva", version: 4 } });
    render(<GeneralSettingsPage />);
    const name = await screen.findByDisplayValue("Acme Console");
    await user.clear(name);
    await user.type(name, "Nueva");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(session.api).toHaveBeenLastCalledWith("v1/settings", expect.objectContaining({ method: "PUT" }));
    expect(await screen.findByText("La configuración se actualizó.")).toBeInTheDocument();
  });

  it("shows field errors on 422", async () => {
    const user = userEvent.setup();
    session.user = adminUser();
    session.api
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: remoteSettings })
      .mockRejectedValueOnce(new ApiError("Request contains invalid fields", 422, {
        errors: [{ field: "jwtSecret", code: "protected" }],
      }));
    render(<GeneralSettingsPage />);
    const name = await screen.findByDisplayValue("Acme Console");
    await user.type(name, " X");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("jwtSecret: Esta clave no es configurable desde la consola.")).toBeInTheDocument();
  });

  it("reloads after a 409 conflict", async () => {
    const user = userEvent.setup();
    session.user = adminUser();
    session.api
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: remoteSettings })
      .mockRejectedValueOnce(new ApiError("The settings were updated by someone else", 409))
      .mockResolvedValueOnce({ status: 200, message: "Ok", data: { ...remoteSettings, displayName: "Otro", version: 9 } });
    render(<GeneralSettingsPage />);
    const name = await screen.findByDisplayValue("Acme Console");
    await user.type(name, " X");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Alguien actualizó la configuración. Recargamos la versión actual.")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Otro")).toBeInTheDocument();
  });

  it("offers retry when the backend is down", async () => {
    session.user = adminUser();
    session.api.mockRejectedValueOnce(new Error("Backend no disponible"));
    render(<GeneralSettingsPage />);
    expect(await screen.findByText("No pudimos cargar la configuración.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
