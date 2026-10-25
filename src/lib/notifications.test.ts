import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatUnread,
  listNotifications,
  mapsUrl,
  markAllRead,
  markRead,
  notificationText,
  unreadCount,
} from "@/lib/notifications";
import { formatChileDateTime } from "@/lib/tags";
import type { AppNotification } from "@/lib/types";

function envelope<T>(data: T) {
  return { status: 200, message: "Ok", data };
}

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function notification(kind: AppNotification["kind"], payload: Partial<AppNotification["payload"]> = {}): AppNotification {
  return {
    id: "n1",
    kind,
    petId: "p1",
    tagId: "t1",
    payload: { petName: "Hachi", tagCode: "K7M2Q9XR41", scannedAt: "2026-10-20T15:30:00Z", ...payload },
    createdAt: "2026-10-20T15:30:00Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notificationText", () => {
  it("describes a scan with date and device", () => {
    const text = notificationText(notification("tag_scanned", { device: "ios" }));
    expect(text.title).toBe("Escanearon la placa de Hachi");
    expect(text.body).toBe(`${formatChileDateTime("2026-10-20T15:30:00Z")} · iPhone o iPad`);
  });

  it("omits the device when absent", () => {
    expect(notificationText(notification("tag_scanned")).body).toBe(formatChileDateTime("2026-10-20T15:30:00Z"));
  });

  it("shows the finder message and truncates it past 140 characters", () => {
    const short = notificationText(notification("finder_message", { message: { body: "La tengo yo" } }));
    expect(short.title).toBe("Hachi: te dejaron un mensaje");
    expect(short.body).toBe("La tengo yo");
    const long = notificationText(notification("finder_message", { message: { body: "a".repeat(200) } }));
    expect(long.body).toBe(`${"a".repeat(140)}…`);
    const exact = notificationText(notification("finder_message", { message: { body: "b".repeat(140) } }));
    expect(exact.body).toBe("b".repeat(140));
  });

  it("handles location shared and phone revealed", () => {
    expect(notificationText(notification("location_shared"))).toEqual({
      title: "Hachi: compartieron su ubicación",
      body: "Toca para ver en el mapa",
    });
    expect(notificationText(notification("phone_revealed"))).toEqual({
      title: "Hachi: alguien vio tu número",
      body: "Quien encontró a Hachi pidió tu teléfono",
    });
  });
});

describe("formatUnread", () => {
  it("hides zero, shows the count and caps at 99+", () => {
    expect(formatUnread(0)).toBe("");
    expect(formatUnread(1)).toBe("1");
    expect(formatUnread(99)).toBe("99");
    expect(formatUnread(100)).toBe("99+");
    expect(formatUnread(150)).toBe("99+");
  });
});

describe("mapsUrl", () => {
  it("builds a Google Maps link with six decimals", () => {
    expect(mapsUrl(-33.4489, -70.6693)).toBe("https://maps.google.com/?q=-33.448900,-70.669300");
  });
});

describe("notification client", () => {
  it("lists notifications with the default limit", async () => {
    const page = { data: [notification("tag_scanned")], limit: 20, hasNext: true, nextCursor: "CUR1" };
    const fetchMock = stubFetch(200, envelope(page));
    await expect(listNotifications()).resolves.toEqual(page);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/v1/notifications?limit=20");
  });

  it("passes cursor and limit", async () => {
    const fetchMock = stubFetch(200, envelope({ data: [], limit: 5, hasNext: false }));
    await listNotifications("abc==", 5);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/v1/notifications?limit=5&cursor=abc%3D%3D");
  });

  it("reads the unread count", async () => {
    const fetchMock = stubFetch(200, envelope({ count: 7 }));
    await expect(unreadCount()).resolves.toBe(7);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backend/v1/notifications/unread-count");
  });

  it("marks one notification as read", async () => {
    const fetchMock = stubFetch(204, null);
    await expect(markRead("n 1")).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/v1/notifications/n%201/read");
    expect(init.method).toBe("POST");
  });

  it("marks all as read and returns the updated count", async () => {
    const fetchMock = stubFetch(200, envelope({ updated: 3 }));
    await expect(markAllRead()).resolves.toBe(3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/v1/notifications/read-all");
    expect(init.method).toBe("POST");
  });
});
