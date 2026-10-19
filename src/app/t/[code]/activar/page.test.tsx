import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => {
  const state = {
    pathname: "/t/K7M2Q9XR40/activar",
    params: { code: "K7M2Q9XR40" } as { code: string },
    search: new URLSearchParams(""),
    pushed: [] as string[],
    router: { push: (href: string) => { state.pushed.push(href); }, replace: () => {}, refresh: () => {}, back: () => {} },
  };
  // Also exposed globally so the suite can run where vi.mock is unavailable; harmless under vitest.
  (globalThis as { __nav?: unknown }).__nav = state;
  return state;
});

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useParams: () => nav.params,
  useSearchParams: () => nav.search,
  useRouter: () => nav.router,
}));

import ActivateTagPage from "./page";

const PET_ID = "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11";
const pet = { id: PET_ID, name: "Luna", species: "dog", photoUrl: "" };
const other = { id: "9b1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d22", name: "Michi", species: "cat", photoUrl: "" };

function json(status: number, body: unknown, type = "application/json") {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": type } });
}

describe("ActivateTagPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    nav.pushed.length = 0;
    nav.params = { code: "K7M2Q9XR40" };
  });

  it("offers to create a pet when the owner has none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { status: 200, message: "Ok", data: [] })));
    render(<ActivateTagPage />);
    const link = await screen.findByRole("link", { name: "Crear la ficha de tu mascota" });
    expect(link).toHaveAttribute("href", "/dashboard/pets/new");
  });

  it("links the tag to the chosen pet and redirects to the pet", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json(200, { status: 200, message: "Ok", data: { id: "t1" } })
        : json(200, { status: 200, message: "Ok", data: [pet, other] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ActivateTagPage />);
    expect(await screen.findByText("K7M2 Q9XR 40")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Vincular placa" });
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: /Luna/ }));
    await userEvent.click(button);
    await waitFor(() => expect(nav.pushed).toEqual([`/dashboard/pets/${PET_ID}?tag=activated`]));
    const post = fetchMock.mock.calls.find((call) => (call[1] as RequestInit | undefined)?.method === "POST")!;
    expect(String(post[0])).toBe("/api/backend/v1/tags/K7M2Q9XR40/activate");
    expect(JSON.parse((post[1] as RequestInit).body as string)).toEqual({ petId: PET_ID });
  });

  it("preselects the only pet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(200, { status: 200, message: "Ok", data: [pet] })));
    render(<ActivateTagPage />);
    await screen.findByRole("radio", { name: /Luna/ });
    expect(screen.getByRole("button", { name: "Vincular placa" })).not.toBeDisabled();
  });

  it("shows the translated message when the tag is already linked", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? json(409, { title: "Conflict", status: 409, detail: "This tag is already linked" }, "application/problem+json")
        : json(200, { status: 200, message: "Ok", data: [pet] })));
    render(<ActivateTagPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Vincular placa" }));
    expect(await screen.findByText("Esta placa ya está vinculada")).toBeInTheDocument();
    expect(nav.pushed).toEqual([]);
  });

  it("rejects an invalid code without calling the API", async () => {
    nav.params = { code: "NOPE" };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ActivateTagPage />);
    expect(await screen.findByText("Este código no es válido")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Volver/ })).toHaveAttribute("href", "/dashboard/pets");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
