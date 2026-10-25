"use client";

import { NOTIFICATIONS_CHANGED_EVENT } from "@/components/notification-bell";
import { LoadingState, Notice } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { listNotifications, markAllRead, markRead, mapsUrl, notificationText } from "@/lib/notifications";
import { formatChileDateTime } from "@/lib/tags";
import type { AppNotification } from "@/lib/types";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function announceChange() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function NotificationsList() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [next, setNext] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (cursor?: string) => {
    try {
      const page = await listNotifications(cursor);
      setItems((current) => (cursor ? [...(current ?? []), ...page.data] : page.data));
      setNext(page.hasNext ? page.nextCursor : undefined);
      setError("");
    } catch (caught) {
      setError(errorMessage(caught));
      setItems((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    await load(next);
    setLoadingMore(false);
  }

  async function open(notification: AppNotification) {
    if (!notification.readAt) {
      try {
        await markRead(notification.id);
        const readAt = new Date().toISOString();
        setItems((current) => current?.map((entry) => (entry.id === notification.id ? { ...entry, readAt } : entry)) ?? current);
        announceChange();
      } catch {
        // Navigating matters more than the read flag; the next poll corrects the count.
      }
    }
    router.push(`/dashboard/pets/${notification.petId}`);
  }

  async function readAll() {
    setMarkingAll(true);
    try {
      await markAllRead();
      const readAt = new Date().toISOString();
      setItems((current) => current?.map((entry) => (entry.readAt ? entry : { ...entry, readAt })) ?? current);
      setError("");
      announceChange();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setMarkingAll(false);
    }
  }

  if (!items) return <section className="panel"><LoadingState /></section>;

  const hasUnread = items.some((entry) => !entry.readAt);

  return (
    <section className="panel notifications">
      <div className="notifications-toolbar">
        <button type="button" className="button secondary" onClick={readAll} disabled={!hasUnread || markingAll}>
          Marcar todo como leído
        </button>
      </div>
      <div className="pet-section-body">
        <Notice message={error} kind="error" />
        {items.length === 0 ? (
          <p className="pet-section-empty">Aún no tienes avisos. Te contaremos aquí cuando alguien escanee una placa.</p>
        ) : (
          <ul className="notification-list">
            {items.map((entry) => {
              const { title, body } = notificationText(entry);
              const unread = !entry.readAt;
              const location = entry.payload.location;
              const message = entry.kind === "finder_message" ? entry.payload.message : undefined;
              return (
                <li key={entry.id} className={`notification-item${unread ? " notification-unread" : ""}`}>
                  <button type="button" className="notification-main" onClick={() => void open(entry)}>
                    {unread && <span className="sr-only">No leído</span>}
                    <strong>{title}</strong>
                    {!message && <span>{body}</span>}
                  </button>
                  {message && (
                    <blockquote className="pet-scan-message">
                      <p>{message.body}</p>
                      {message.finderName && <footer><span>{message.finderName}</span></footer>}
                    </blockquote>
                  )}
                  <p className="notification-meta">
                    <time dateTime={entry.createdAt}>{formatChileDateTime(entry.createdAt)}</time>
                    {location && (
                      <a href={mapsUrl(location.lat, location.lng)} target="_blank" rel="noopener noreferrer">
                        <MapPin size={13} /> Ver en el mapa
                      </a>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        {next && (
          <div className="form-submit">
            <button type="button" className="button secondary" onClick={loadMore} disabled={loadingMore}>Ver más</button>
          </div>
        )}
      </div>
    </section>
  );
}
