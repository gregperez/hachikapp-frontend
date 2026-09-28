"use client";

import { LoadingState, Modal, Notice, PageHeader } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { api, dataOf, errorMessage } from "@/lib/api";
import { AUDIT_ACTION_OPTIONS, buildAuditQuery } from "@/lib/audit-query";
import { formatDateTime } from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import { ENTITY_IDS, type ApiEnvelope, type AuditEvent, type AuditFilters, type CursorPage } from "@/lib/types";
import { ChevronLeft, ChevronRight, ClipboardList, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 20;
const emptyFilters: AuditFilters = { action: "", outcome: "", actorId: "", subjectId: "", from: "", to: "" };

export default function AuditPage() {
  const { user } = useSession();
  const allowed = canAccess(user, { entity: ENTITY_IDS.AUDIT_EVENTS, action: "read" });
  const [page, setPage] = useState<CursorPage<AuditEvent> | null>(null);
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
  const [applied, setApplied] = useState<AuditFilters>(emptyFilters);
  const [cursor, setCursor] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const load = useCallback(async (activeFilters: AuditFilters, activeCursor = "") => {
    setLoading(true);
    try {
      const envelope = await api<ApiEnvelope<CursorPage<AuditEvent>>>(buildAuditQuery(activeFilters, PAGE_SIZE, activeCursor));
      setPage(dataOf(envelope));
      setNotice(null);
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void load(emptyFilters);
  }, [allowed, load]);

  if (!allowed) {
    return (
      <>
        <PageHeader eyebrow="SEGURIDAD" title="Auditoría" description="Consulta quién hizo qué, sobre cuál recurso y cuándo." />
        <div className="empty-state">
          <ClipboardList size={28} />
          <p>No tienes permiso para consultar el registro de auditoría.</p>
        </div>
      </>
    );
  }

  const events = page?.data || [];

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setApplied(filters);
    setCursor("");
    setHistory([]);
    void load(filters, "");
  }

  function nextPage() {
    if (!page?.nextCursor) return;
    setHistory((values) => [...values, cursor]);
    setCursor(page.nextCursor);
    void load(applied, page.nextCursor);
  }

  function previousPage() {
    const previous = history.at(-1) ?? "";
    setHistory((values) => values.slice(0, -1));
    setCursor(previous);
    void load(applied, previous);
  }

  return (
    <>
      <PageHeader eyebrow="SEGURIDAD" title="Auditoría" description="Eventos administrativos sanitizados. No incluye secretos ni correos." />
      <Notice message={notice?.message} kind={notice?.kind} />

      <section className="panel form-panel">
        <form className="modal-form" onSubmit={applyFilters}>
          <div className="form-grid two-columns">
            <label>Acción
              <select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}>
                <option value="">Todas</option>
                {AUDIT_ACTION_OPTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
              </select>
            </label>
            <label>Resultado
              <select value={filters.outcome} onChange={(event) => setFilters({ ...filters, outcome: event.target.value })}>
                <option value="">Todos</option>
                <option value="success">success</option>
                <option value="failure">failure</option>
              </select>
            </label>
            <label>Actor ID<input value={filters.actorId} onChange={(event) => setFilters({ ...filters, actorId: event.target.value })} /></label>
            <label>Sujeto ID<input value={filters.subjectId} onChange={(event) => setFilters({ ...filters, subjectId: event.target.value })} /></label>
            <label>Desde<input type="datetime-local" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
            <label>Hasta<input type="datetime-local" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
          </div>
          <div className="form-submit">
            <button type="submit" className="button primary" disabled={loading}><Search size={16} /> Filtrar</button>
          </div>
        </form>
      </section>

      <section className="panel">
        {loading ? (
          <LoadingState />
        ) : notice?.kind === "error" && events.length === 0 ? (
          <div className="empty-state">
            <p>No pudimos cargar el registro.</p>
            <button type="button" className="button secondary" onClick={() => void load(applied, cursor)}>Reintentar</button>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={28} />
            <p>No hay eventos para estos filtros.</p>
          </div>
        ) : (
          <ul className="session-list">
            {events.map((event) => (
              <li key={event.id} className="session-row">
                <div>
                  <strong>{event.action}</strong>
                  <p>
                    <span className={`role-tag ${event.outcome === "success" ? "admin" : ""}`}>{event.outcome}</span>
                    <span> {formatDateTime(event.occurredAt)}</span>
                    <span> · actor {event.actorId}</span>
                  </p>
                </div>
                <button type="button" className="button secondary compact" onClick={() => setSelected(event)}>Detalle</button>
              </li>
            ))}
          </ul>
        )}
        {(page?.hasNext || history.length > 0) && (
          <div className="form-submit">
            <button type="button" className="button ghost" disabled={history.length === 0} onClick={previousPage}><ChevronLeft size={16} /> Anterior</button>
            <button type="button" className="button ghost" disabled={!page?.hasNext} onClick={nextPage}>Siguiente <ChevronRight size={16} /></button>
          </div>
        )}
      </section>

      <Modal open={selected !== null} title={selected?.action || "Evento"} onClose={() => setSelected(null)}>
        {selected && (
          <dl className="audit-detail">
            <div><dt>Cuándo</dt><dd>{formatDateTime(selected.occurredAt)}</dd></div>
            <div><dt>Categoría</dt><dd>{selected.category}</dd></div>
            <div><dt>Resultado</dt><dd>{selected.outcome}</dd></div>
            <div><dt>Actor</dt><dd>{selected.actorId}</dd></div>
            <div><dt>Sujeto</dt><dd>{selected.subjectType} {selected.subjectId}</dd></div>
            {selected.requestId && <div><dt>Request</dt><dd>{selected.requestId}</dd></div>}
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div><dt>Metadata</dt><dd>{JSON.stringify(selected.metadata)}</dd></div>
            )}
          </dl>
        )}
      </Modal>
    </>
  );
}
