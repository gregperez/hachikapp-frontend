import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/types";
import { adminUser, makeUser, usersReader } from "@/test/users";

const session = vi.hoisted(() => ({
  user: null as User | null,
  pathname: "/dashboard",
  logout: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => session.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/components/session-provider", () => ({
  useSession: () => ({
    user: session.user,
    loading: false,
    logout: session.logout,
    refresh: session.refresh,
  }),
}));

vi.mock("@/components/settings-provider", () => ({
  useSettings: () => ({
    settings: { displayName: "Base Console", logoUrl: "", defaultLocale: "es" },
    preferences: { theme: "system", locale: "", timeZone: "" },
    source: "fallback",
    loading: false,
    refresh: vi.fn(),
    savePreferences: vi.fn(),
  }),
}));

vi.mock("@/components/ai-chat-panel", () => ({
  AIChatPanel: ({ open }: { open: boolean }) => (open ? <div>Panel del asistente</div> : null),
}));

import { AppShell } from "./app-shell";

function renderShell(user: User | null, pathname = "/dashboard") {
  session.user = user;
  session.pathname = pathname;
  return render(<AppShell>contenido</AppShell>);
}

describe("AppShell navigation", () => {
  beforeEach(() => {
    session.user = null;
    session.pathname = "/dashboard";
    session.logout.mockReset();
  });

  it("renders every module for an admin", () => {
    renderShell(adminUser());
    expect(screen.getByRole("link", { name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roles y permisos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Auditoría" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configuración" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Integraciones" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mi perfil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menú de cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Asistente IA/ })).toBeInTheDocument();
  });

  it("shows only granted administrative links for a partial user", () => {
    renderShell(usersReader());
    expect(screen.getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Roles y permisos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Auditoría" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Configuración" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Integraciones" })).not.toBeInTheDocument();
    expect(screen.getByText("Administración")).toBeInTheDocument();
  });

  it("omits empty administrative sections", () => {
    renderShell(makeUser());
    expect(screen.queryByText("Administración")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resumen" })).toBeInTheDocument();
  });

  it("marks the current page with aria-current", () => {
    renderShell(adminUser(), "/dashboard/roles");
    expect(screen.getByRole("link", { name: "Roles y permisos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Resumen" })).not.toHaveAttribute("aria-current");
  });

  it("opens the AI panel from an action, not a link", async () => {
    const user = userEvent.setup();
    renderShell(makeUser(), "/dashboard");
    const trigger = screen.getByRole("button", { name: /Asistente IA/ });
    expect(screen.queryByRole("link", { name: /Asistente IA/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Panel del asistente")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByText("Panel del asistente")).toBeInTheDocument();
    expect(session.pathname).toBe("/dashboard");
  });
});
