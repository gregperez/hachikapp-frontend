"use client";

import { LoadingState, PageHeader } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { canAccess } from "@/lib/permissions";
import { statusLabel, visibleIntegrations, type IntegrationView } from "@/lib/integrations";
import { ENTITY_IDS } from "@/lib/types";
import { Blocks, Plug } from "lucide-react";
import { useEffect, useState } from "react";

export default function IntegrationsPage() {
  const { user } = useSession();
  const allowed = canAccess(user, { entity: ENTITY_IDS.SETTINGS, action: "read" });
  const visible = visibleIntegrations(user);
  const [items, setItems] = useState<IntegrationView[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetch("/api/integrations")
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { items?: IntegrationView[]; detail?: string } | null;
        if (!response.ok) throw new Error(payload?.detail || "No pudimos cargar las integraciones.");
        if (!cancelled) setItems(payload?.items || []);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "No pudimos cargar las integraciones.");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <>
        <PageHeader eyebrow="ADMINISTRACIÓN" title="Integraciones" description="Estado de los adaptadores reales de identidad e inteligencia." />
        <div className="empty-state">
          <Plug size={28} />
          <p>No tienes permiso para consultar las integraciones.</p>
        </div>
      </>
    );
  }

  const catalog = (items || []).filter((item) => visible.some((entry) => entry.id === item.id));

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRACIÓN"
        title="Integraciones"
        description="Solo aparecen adaptadores existentes. El estado nunca incluye secretos, DSN ni endpoints privados."
      />
      {!items && !error ? (
        <LoadingState />
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>
        </div>
      ) : catalog.length === 0 ? (
        <div className="empty-state">
          <Blocks size={28} />
          <p>No hay integraciones visibles para tu cuenta.</p>
        </div>
      ) : (
        <ul className="integration-grid">
          {catalog.map((item) => (
            <li key={item.id} className="panel integration-card">
              <div className="panel-heading">
                <div>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>
                <span className={`status-badge ${item.status === "configured" ? "success" : item.status === "degraded" ? "warning" : "neutral"}`}>
                  <i /> {statusLabel(item.status)}
                </span>
              </div>
              <div className="integration-card-body">
                <a className="text-link" href={item.documentationHref} target="_blank" rel="noreferrer">Documentación</a>
                {item.action && <a className="button secondary compact" href={item.action.href}>{item.action.label}</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
