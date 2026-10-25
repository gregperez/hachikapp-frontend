import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/types";

const nav = vi.hoisted(() => {
  const state = {
    pathname: "/dashboard/avisos",
    params: {},
    search: new URLSearchParams(),
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

import { NotificationsList } from "./notifications-list";

const PET = "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11";

function item(overrides: Partial<AppNotification> & { id: string }): AppNotification {
  return {
    kind: "tag_scanned", petId: PET, tagId: "t1", createdAt: "2026-10-01T15:30:00Z",
    payload: { petName: "Luna", tagCode: "K7M2Q9XR40", scannedAt: "2026-10-01T15:30:00Z" },
    ...overrides,
  };
}

function page(items: AppNotification[], hasNext = false, nextCursor?: string) {
  return new Response(JSON.stringify({ data: items, limit: 20, hasNext, nextCursor }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

const empty204 = () => new Response(null, { status: 204 });

describe("NotificationsList", () => {
  afterEach(() => { vi.unstubAllGlobals(); nav.pushed.length = 0; });

  it("shows the empty text", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page([])));
    render(<NotificationsList />);
    expect(await screen.findByText("Aún no tienes avisos. Te contaremos aquí cuando alguien escanee una placa.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar todo como leído" })).toBeDisabled();
  });

  it("shows an error message when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Invalid credentials" }), { status: 401 })));
    render(<NotificationsList />);
    expect(await screen.findByText("Las credenciales no son válidas.")).toBeInTheDocument();
  });

  it("renders the text of each kind, the map link and the finder message", async () => {
    const location = { lat: -33.4372, lng: -70.6506, accuracyM: 20, at: "2026-10-01T15:31:00Z" };
    const items = [
      item({ id: "n1", kind: "tag_scanned", payload: { petName: "Luna", tagCode: "K", scannedAt: "2026-10-01T15:30:00Z", device: "ios" } }),
      item({ id: "n2", kind: "location_shared", payload: { petName: "Luna", tagCode: "K", scannedAt: "2026-10-01T15:30:00Z", location } }),
      item({ id: "n3", kind: "finder_message", payload: { petName: "Luna", tagCode: "K", scannedAt: "2026-10-01T15:30:00Z", message: { body: "Está conmigo en la plaza", finderName: "Camila" } } }),
      item({ id: "n4", kind: "phone_revealed", payload: { petName: "Luna", tagCode: "K", scannedAt: "2026-10-01T15:30:00Z", phoneRevealed: true } }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => page(items)));
    render(<NotificationsList />);
    expect(await screen.findByText("Escanearon la placa de Luna")).toBeInTheDocument();
    expect(screen.getByText("Luna: compartieron dónde la encontraron")).toBeInTheDocument();
    expect(screen.getByText("Luna: te dejaron un mensaje")).toBeInTheDocument();
    expect(screen.getByText("Está conmigo en la plaza")).toBeInTheDocument();
    expect(screen.getByText("Luna: alguien vio tu número")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Ver en el mapa" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://maps.google.com/?q=-33.437200,-70.650600");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("highlights unread items with a screen reader label", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => page([
      item({ id: "n1" }),
      item({ id: "n2", readAt: "2026-10-02T10:00:00Z" }),
    ])));
    render(<NotificationsList />);
    await screen.findAllByText("Escanearon la placa de Luna");
    expect(screen.getAllByText("No leído")).toHaveLength(1);
    expect(document.querySelectorAll("li.notification-unread")).toHaveLength(1);
  });

  it("marks an unread item as read and goes to the pet on click", async () => {
    const changed = vi.fn();
    window.addEventListener("hachikapp:notifications-changed", changed);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([item({ id: "n 1" })]))
      .mockResolvedValueOnce(empty204());
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Escanearon la placa de Luna/ }));
    await waitFor(() => expect(nav.pushed).toEqual([`/dashboard/pets/${PET}`]));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/backend/v1/notifications/n%201/read");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST" }));
    expect(changed).toHaveBeenCalled();
    window.removeEventListener("hachikapp:notifications-changed", changed);
  });

  it("still navigates when marking as read fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([item({ id: "n1" })]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "boom" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Escanearon la placa de Luna/ }));
    await waitFor(() => expect(nav.pushed).toContain(`/dashboard/pets/${PET}`));
  });

  it("ignores a second click while marking as read is pending", async () => {
    let release: (value: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => { release = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([item({ id: "n1" })]))
      .mockReturnValueOnce(pending);
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationsList />);
    const button = await screen.findByRole("button", { name: /Escanearon la placa de Luna/ });
    await userEvent.click(button);
    await userEvent.click(button);
    release(empty204());
    await waitFor(() => expect(nav.pushed).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not post when the item is already read", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(page([item({ id: "n1", readAt: "2026-10-02T10:00:00Z" })]));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Escanearon la placa de Luna/ }));
    await waitFor(() => expect(nav.pushed).toEqual([`/dashboard/pets/${PET}`]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks everything as read and updates the list locally", async () => {
    const changed = vi.fn();
    window.addEventListener("hachikapp:notifications-changed", changed);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([item({ id: "n1" }), item({ id: "n2" })]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 200, message: "Ok", data: { updated: 2 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationsList />);
    await screen.findAllByText("No leído");
    await userEvent.click(screen.getByRole("button", { name: "Marcar todo como leído" }));
    await waitFor(() => expect(screen.queryAllByText("No leído")).toHaveLength(0));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/backend/v1/notifications/read-all");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "POST" }));
    expect(screen.getByRole("button", { name: "Marcar todo como leído" })).toBeDisabled();
    expect(changed).toHaveBeenCalled();
    window.removeEventListener("hachikapp:notifications-changed", changed);
  });

  it("loads more with the cursor", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(page([item({ id: "n1" })], true, "CUR1"))
      .mockResolvedValueOnce(page([item({ id: "n2", payload: { petName: "Toby", tagCode: "K", scannedAt: "2026-10-01T15:30:00Z" } })]));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationsList />);
    await userEvent.click(await screen.findByRole("button", { name: "Ver más" }));
    expect(await screen.findByText("Escanearon la placa de Toby")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/backend/v1/notifications?limit=20&cursor=CUR1");
    expect(screen.getByText("Escanearon la placa de Luna")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });
});
