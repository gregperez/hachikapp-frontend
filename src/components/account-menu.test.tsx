import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "@/test/users";

const navigation = vi.hoisted(() => ({
  pathname: "/dashboard",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
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

import { AccountMenu } from "./account-menu";

describe("AccountMenu", () => {
  const user = makeUser();
  const onLogout = vi.fn();

  beforeEach(() => {
    navigation.pathname = "/dashboard";
    onLogout.mockReset();
  });

  it("stays closed until the trigger is activated", () => {
    render(<AccountMenu user={user} loading={false} onLogout={onLogout} />);
    const trigger = screen.getByRole("button", { name: "Menú de cuenta" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "account-menu");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens with ARIA attributes after click, Enter or Space", async () => {
    const events = userEvent.setup();
    render(<AccountMenu user={user} loading={false} onLogout={onLogout} />);
    const trigger = screen.getByRole("button", { name: "Menú de cuenta" });

    await events.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Ada" })).toBeInTheDocument();

    await events.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    trigger.focus();
    await events.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await events.keyboard("{Escape}");

    trigger.focus();
    await events.keyboard(" ");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const events = userEvent.setup();
    render(<AccountMenu user={user} loading={false} onLogout={onLogout} />);
    const trigger = screen.getByRole("button", { name: "Menú de cuenta" });
    await events.click(trigger);
    await events.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on an outside click and restores focus to the trigger", async () => {
    const events = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">fuera</div>
        <AccountMenu user={user} loading={false} onLogout={onLogout} />
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Menú de cuenta" });
    await events.click(trigger);
    await events.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("navigates to profile and security without duplicating pages", async () => {
    const events = userEvent.setup();
    render(<AccountMenu user={user} loading={false} onLogout={onLogout} />);
    await events.click(screen.getByRole("button", { name: "Menú de cuenta" }));
    expect(screen.getByRole("menuitem", { name: "Mi perfil" })).toHaveAttribute("href", "/dashboard/profile");
    expect(screen.getByRole("menuitem", { name: "Seguridad" })).toHaveAttribute("href", "/dashboard/profile#seguridad");
  });

  it("calls logout once from the menu", async () => {
    const events = userEvent.setup();
    render(<AccountMenu user={user} loading={false} onLogout={onLogout} />);
    await events.click(screen.getByRole("button", { name: "Menú de cuenta" }));
    await events.click(screen.getByRole("menuitem", { name: "Cerrar sesión" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not trap keyboard focus inside the menu", async () => {
    const events = userEvent.setup();
    render(
      <div>
        <AccountMenu user={user} loading={false} onLogout={onLogout} />
        <button type="button">Después</button>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Menú de cuenta" });
    await events.click(trigger);
    await events.tab();
    await events.tab();
    await events.tab();
    await events.tab();
    expect(screen.getByRole("button", { name: "Después" })).toHaveFocus();
    expect(trigger).not.toHaveFocus();
  });
});
