import { api, dataOf } from "@/lib/api";
import { deviceLabel, formatChileDateTime } from "@/lib/tags";
import type { ApiEnvelope, AppNotification, CursorPage } from "@/lib/types";

const MESSAGE_PREVIEW_LENGTH = 140;

export async function listNotifications(cursor?: string, limit = 20): Promise<CursorPage<AppNotification>> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  return dataOf(await api<ApiEnvelope<CursorPage<AppNotification>>>(`v1/notifications?${query.toString()}`));
}

export async function unreadCount(): Promise<number> {
  const envelope = await api<ApiEnvelope<{ count: number }>>("v1/notifications/unread-count");
  return dataOf(envelope).count;
}

export async function markRead(id: string): Promise<void> {
  await api<unknown>(`v1/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

/** Returns how many notifications were marked as read. */
export async function markAllRead(): Promise<number> {
  const envelope = await api<ApiEnvelope<{ updated: number }>>("v1/notifications/read-all", { method: "POST" });
  return dataOf(envelope).updated;
}

export function notificationText(n: AppNotification): { title: string; body: string } {
  const { petName, scannedAt, device, message } = n.payload;
  switch (n.kind) {
    case "tag_scanned":
      return {
        title: `Escanearon la placa de ${petName}`,
        body: device ? `${formatChileDateTime(scannedAt)} · ${deviceLabel(device)}` : formatChileDateTime(scannedAt),
      };
    case "finder_message": {
      const text = message?.body ?? "";
      return {
        title: `${petName}: te dejaron un mensaje`,
        body: text.length > MESSAGE_PREVIEW_LENGTH ? `${text.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : text,
      };
    }
    case "location_shared":
      return { title: `${petName}: compartieron su ubicación`, body: "Toca para ver en el mapa" };
    case "phone_revealed":
      return { title: `${petName}: alguien vio tu número`, body: `Quien encontró a ${petName} pidió tu teléfono` };
  }
}

/** Badge text for the bell: empty when nothing is unread, capped at 99+. */
export function formatUnread(count: number): string {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
