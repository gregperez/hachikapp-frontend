import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagBatchesAdmin } from "./tag-batches-admin";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ status, message: "Ok", data }), { status, headers: { "Content-Type": "application/json" } });
}
const batch = (id: string, label: string, quantity: number) => ({ id, label, quantity, createdAt: "2026-10-01T15:00:00Z" });
const list = (items: unknown[]) => json({ data: items, limit: 20, hasNext: false });

describe("TagBatchesAdmin", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("lists batches with CSV links", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => list([batch("b1", "Feria", 50)])));
    render(<TagBatchesAdmin canCreate={false} />);
    expect(await screen.findByText("Feria")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Descargar CSV/ });
    expect(link).toHaveAttribute("href", "/api/backend/v1/admin/tag-batches/b1/codes.csv");
    expect(link).toHaveAttribute("download", "placas-b1.csv");
    expect(screen.queryByLabelText("Nombre del lote")).not.toBeInTheDocument();
  });

  it("creates a batch of 10 and shows its CSV link on top", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(batch("b2", "Lote nuevo", 10), 201) : list([batch("b1", "Feria", 50)]));
    vi.stubGlobal("fetch", fetchMock);
    render(<TagBatchesAdmin canCreate />);
    await screen.findByText("Feria");
    await userEvent.type(screen.getByLabelText("Nombre del lote"), "Lote nuevo");
    await userEvent.type(screen.getByLabelText("Cantidad"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Crear lote" }));
    expect(await screen.findByText("Lote nuevo")).toBeInTheDocument();
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(post[0]).toBe("/api/backend/v1/admin/tag-batches");
    expect(JSON.parse(post[1]!.body as string)).toEqual({ label: "Lote nuevo", quantity: 10 });
    const links = screen.getAllByRole("link", { name: /Descargar CSV/ });
    expect(links[0]).toHaveAttribute("href", "/api/backend/v1/admin/tag-batches/b2/codes.csv");
  });

  it("rejects 1001 without calling the API", async () => {
    const fetchMock = vi.fn(async () => list([]));
    vi.stubGlobal("fetch", fetchMock);
    render(<TagBatchesAdmin canCreate />);
    await userEvent.type(await screen.findByLabelText("Nombre del lote"), "Grande");
    await userEvent.type(screen.getByLabelText("Cantidad"), "1001");
    await userEvent.click(screen.getByRole("button", { name: "Crear lote" }));
    expect(await screen.findByText("Ingresa un número entre 1 y 1000")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps server field errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => init?.method === "POST"
      ? new Response(JSON.stringify({ title: "x", detail: "Batch contains invalid fields", errors: [{ field: "quantity", code: "max" }] }), { status: 422, headers: { "Content-Type": "application/problem+json" } })
      : list([])));
    render(<TagBatchesAdmin canCreate />);
    await userEvent.type(await screen.findByLabelText("Nombre del lote"), "Ok");
    await userEvent.type(screen.getByLabelText("Cantidad"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Crear lote" }));
    expect(await screen.findByText("Ingresa un número entre 1 y 1000")).toBeInTheDocument();
  });
});
