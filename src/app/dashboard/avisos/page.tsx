"use client";

import { NotificationsList } from "@/components/notifications-list";
import { PageHeader } from "@/components/ui";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Avisos" description="Cuando alguien escanee la placa de tus mascotas, te lo contamos aquí." />
      <NotificationsList />
    </>
  );
}
