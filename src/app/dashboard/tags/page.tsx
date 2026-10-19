"use client";

import { PageHeader } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { TagBatchesAdmin } from "@/components/tag-batches-admin";
import { canAccess } from "@/lib/permissions";
import { ENTITY_IDS } from "@/lib/types";
import { Tag } from "lucide-react";

export default function TagsAdminPage() {
  const { user } = useSession();
  const allowed = canAccess(user, { entity: ENTITY_IDS.TAGS, action: "read" });
  const canCreate = canAccess(user, { entity: ENTITY_IDS.TAGS, action: "create" });

  if (!allowed) {
    return (
      <>
        <PageHeader eyebrow="ADMINISTRACIÓN" title="Placas" description="Lotes de placas físicas para imprimir." />
        <div className="empty-state">
          <Tag size={28} />
          <p>No tienes permiso para administrar placas.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="ADMINISTRACIÓN" title="Placas" description="Crea lotes de códigos y descarga el CSV para la imprenta." />
      <TagBatchesAdmin canCreate={canCreate} />
    </>
  );
}
