import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PetTag } from "@/lib/types";
import { PetTags } from "./pet-tags";

const PET = "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11";

function tag(n: number, over: Partial<PetTag> = {}): PetTag {
  return {
    id: `tag-${n}`, code: `K7M2Q9XR4${n}`, kind: "physical", status: "active", petId: PET,
    activatedAt: "2026-10-01T15:00:00Z", createdAt: "2026-09-01T00:00:00Z", url: `https://hachikapp.cl/t/K7M2Q9XR4${n}`, ...over,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify({ status, message: "Ok", data }), { status, headers: { "Content-Type": "application/json" } });
}

let calls: Array<{ url: string; method: string }>;
let lists: PetTag[][];

function stub(extra?: (url: string, method: string) => Response | undefined) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    const special = extra?.(url, method);
    if (special) return special;
    if (method === "GET") return json(lists.length > 1 ? lists.shift() : lists[0]);
    return json({}, 200);
  }));
}

describe("PetTags", () => {
  beforeEach(() => { calls = []; lists = [[]]; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows the empty text", async () => {
    stub();
    render(<PetTags petId={PET} />);
    expect(await screen.findByText(/Esta mascota aún no tiene placas/)).toBeInTheDocument();
    expect(calls[0].url).toBe(`/api/backend/v1/pets/${PET}/tags`);
  });

  it("lists tags with grouped code, labels and date", async () => {
    lists = [[tag(1), tag(2, { kind: "digital", status: "disabled" })]];
    stub();
    render(<PetTags petId={PET} />);
    expect(await screen.findByText("K7M2 Q9XR 41")).toBeInTheDocument();
    expect(screen.getByText("Placa física")).toBeInTheDocument();
    expect(screen.getByText("Placa digital")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Desactivada")).toBeInTheDocument();
  });

  it("disables creation with 5 active tags and explains why", async () => {
    lists = [[1, 2, 3, 4, 5].map((n) => tag(n))];
    stub();
    render(<PetTags petId={PET} />);
    const button = await screen.findByRole("button", { name: /Crear placa digital/ });
    expect(button).toBeDisabled();
    expect(screen.getByText("Ya tiene 5 placas activas. Desactiva una para crear otra.")).toBeInTheDocument();
  });

  it("creates a digital tag then reloads", async () => {
    lists = [[], [tag(1, { kind: "digital" })]];
    stub();
    render(<PetTags petId={PET} />);
    await userEvent.click(await screen.findByRole("button", { name: /Crear placa digital/ }));
    expect(await screen.findByText("K7M2 Q9XR 41")).toBeInTheDocument();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET /api/backend/v1/pets/${PET}/tags`,
      `POST /api/backend/v1/pets/${PET}/tags`,
      `GET /api/backend/v1/pets/${PET}/tags`,
    ]);
  });

  it("asks inline confirmation before disabling, and can cancel", async () => {
    lists = [[tag(1)], [tag(1, { status: "disabled" })]];
    stub();
    render(<PetTags petId={PET} />);
    await userEvent.click(await screen.findByRole("button", { name: "Desactivar" }));
    expect(screen.getByText("¿Desactivar esta placa? Quien la escanee ya no verá la ficha. No podrás volver a activarla.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText(/¿Desactivar esta placa\?/)).not.toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, desactivar" }));
    await waitFor(() => expect(screen.getByText("Desactivada")).toBeInTheDocument());
    expect(calls.filter((c) => c.method === "POST").map((c) => c.url)).toEqual([`/api/backend/v1/pets/${PET}/tags/tag-1/disable`]);
  });

  it("copies the link and confirms", async () => {
    lists = [[tag(1)]];
    stub();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<PetTags petId={PET} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copiar enlace" }));
    expect(writeText).toHaveBeenCalledWith("https://hachikapp.cl/t/K7M2Q9XR41");
    expect(await screen.findByText("Enlace copiado")).toBeInTheDocument();
  });

  it("shows the URL when copying fails", async () => {
    lists = [[tag(1)]];
    stub();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => { throw new Error("denied"); }) }, configurable: true });
    render(<PetTags petId={PET} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copiar enlace" }));
    expect(await screen.findByDisplayValue("https://hachikapp.cl/t/K7M2Q9XR41")).toBeInTheDocument();
  });
});
