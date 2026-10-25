"use client";

import { formatUnread, unreadCount } from "@/lib/notifications";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const POLL_MS = 60_000;
export const NOTIFICATIONS_CHANGED_EVENT = "hachikapp:notifications-changed";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const next = await unreadCount();
        if (active) setCount(next);
      } catch {
        // Silent: the bell just shows no badge when the count is unavailable.
        if (active) setCount(0);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onRefresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onRefresh);
    };
  }, []);

  const badge = formatUnread(count);
  return (
    <Link
      href="/dashboard/avisos"
      className="icon-button notification-bell"
      aria-label={count > 0 ? `Avisos, ${count} sin leer` : "Avisos"}
    >
      <Bell size={20} />
      {badge && <span className="notification-badge" aria-hidden="true">{badge}</span>}
    </Link>
  );
}
