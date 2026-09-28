import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/ui";

describe("PageHeader", () => {
  it("exposes the page title as a heading", () => {
    render(
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Gestiona las cuentas del sistema."
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByText("Administración")).toBeInTheDocument();
    expect(screen.getByText("Gestiona las cuentas del sistema.")).toBeInTheDocument();
  });
});
