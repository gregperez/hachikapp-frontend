import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

function countResponse(count: number) {
  return new Response(JSON.stringify({ status: 200, message: "Ok", data: { count } }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

describe("NotificationBell", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("shows the unread count in the badge and the aria-label", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => countResponse(3)));
    render(<NotificationBell />);
    const link = await screen.findByRole("link", { name: "Avisos, 3 sin leer" });
    expect(link).toHaveAttribute("href", "/dashboard/avisos");
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/backend/v1/notifications/unread-count", expect.anything());
  });

  it("caps the badge at 99+", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => countResponse(150)));
    render(<NotificationBell />);
    expect(await screen.findByText("99+")).toBeInTheDocument();
  });

  it("shows no badge when nothing is unread", async () => {
    const fetchMock = vi.fn(async () => countResponse(0));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const link = await screen.findByRole("link", { name: "Avisos" });
    expect(link).toHaveAttribute("href", "/dashboard/avisos");
    expect(link.querySelector(".notification-badge")).toBeNull();
  });

  it("stays silent when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    render(<NotificationBell />);
    const link = await screen.findByRole("link", { name: "Avisos" });
    expect(link.querySelector(".notification-badge")).toBeNull();
  });

  it("keeps the last known count when a later poll fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(countResponse(4))
      .mockResolvedValue(new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell />);
    expect(await screen.findByRole("link", { name: "Avisos, 4 sin leer" })).toBeInTheDocument();
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("link", { name: "Avisos, 4 sin leer" })).toBeInTheDocument();
  });

  it("polls on the interval", async () => {
    const fetchMock = vi.fn(async () => countResponse(1));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell pollMs={30} />);
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("refreshes when the window regains focus", async () => {
    const fetchMock = vi.fn(async () => countResponse(1));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell />);
    await screen.findByRole("link", { name: "Avisos, 1 sin leer" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("stops polling and listening after unmount", async () => {
    const fetchMock = vi.fn(async () => countResponse(1));
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<NotificationBell pollMs={30} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const calls = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("hachikapp:notifications-changed"));
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("refreshes when the notifications-changed event fires", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(countResponse(2))
      .mockResolvedValue(countResponse(0));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationBell />);
    expect(await screen.findByRole("link", { name: "Avisos, 2 sin leer" })).toBeInTheDocument();
    await act(async () => { window.dispatchEvent(new Event("hachikapp:notifications-changed")); });
    expect(await screen.findByRole("link", { name: "Avisos" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
