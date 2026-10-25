"use client";

import { formatUnread, unreadCount } from "@/lib/notifications";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DEFAULT_POLL_MS = 60_000;
export const NOTIFICATIONS_CHANGED_EVENT = "hachikapp:notifications-changed";

export function NotificationBell({ pollMs = DEFAULT_POLL_MS }: { pollMs?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const next = await unreadCount();
        if (active) setCount(next);
      } catch {
        // Silent: keep the last known count when a poll fails.
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), pollMs);
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onRefresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onRefresh);
    };
  }, [pollMs]);

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
