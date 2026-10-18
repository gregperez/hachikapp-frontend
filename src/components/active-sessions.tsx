"use client";

import { LoadingState, Modal, Notice } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { api, dataOf, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ApiEnvelope, CursorPage, Session } from "@/lib/types";
import { MonitorSmartphone, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Confirm =
  | { kind: "one"; session: Session }
  | { kind: "all" }
  | null;

export function ActiveSessions() {
  const { logout } = useSession();
  const [page, setPage] = useState<CursorPage<Session> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const envelope = await api<ApiEnvelope<CursorPage<Session>>>("v1/users/me/sessions?limit=20");
      setPage(dataOf(envelope));
      setNotice(null);
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyRevoke(path: string) {
    setSubmitting(true);
    try {
      const envelope = await api<ApiEnvelope<{ revokedCurrent: boolean }>>(path, { method: "DELETE" });
      setConfirm(null);
      if (dataOf(envelope).revokedCurrent) {
        setNotice({ message: "Cerramos esta sesión. Vuelve a iniciar sesión para continuar.", kind: "success" });
        await logout();
        return;
      }
      await load();
      setNotice({ message: "La sesión fue cerrada.", kind: "success" });
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const sessions = page?.data || [];

  return (
    <section className="panel form-panel" aria-labelledby="active-sessions-title">
      <div className="panel-heading icon-heading">
        <span className="metric-icon blue"><MonitorSmartphone size={20} /></span>
        <div>
          <h2 id="active-sessions-title">Sesiones activas</h2>
          <p>Revisa los dispositivos con acceso a tu cuenta y cierra los que no reconozcas.</p>
        </div>
      </div>
      <Notice message={notice?.message} kind={notice?.kind} />
      {loading ? (
        <LoadingState />
      ) : notice?.kind === "error" && sessions.length === 0 ? (
        <div className="empty-state">
          <p>No pudimos cargar tus sesiones.</p>
          <button type="button" className="button secondary" onClick={() => void load()}>Reintentar</button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <MonitorSmartphone size={28} />
          <p>No hay sesiones activas.</p>
        </div>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => (
            <li key={session.familyId} className="session-row">
              <div>
                <strong>{session.clientLabel || "Cliente desconocido"}</strong>
                <p>
                  {session.current && <span className="role-tag admin">Esta sesión</span>}
                  <span>Visto {formatDate(session.lastSeenAt)}</span>
                  {session.ipPrefix && <span> · {session.ipPrefix}</span>}
                </p>
              </div>
              {!session.current && (
                <button type="button" className="button secondary compact" onClick={() => setConfirm({ kind: "one", session })}>
                  Cerrar
                </button>
              )}
              {session.current && (
                <button type="button" className="button secondary compact" onClick={() => setConfirm({ kind: "one", session })}>
                  Cerrar esta sesión
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {sessions.length > 0 && (
        <div className="form-submit">
          <button type="button" className="button ghost" onClick={() => setConfirm({ kind: "all" })}>
            <ShieldOff size={16} /> Cerrar todas las sesiones
          </button>
        </div>
      )}

      <Modal
        open={confirm !== null}
        title={confirm?.kind === "all" ? "Cerrar todas las sesiones" : "Cerrar esta sesión"}
        description={confirm?.kind === "all"
          ? "Esto incluye el dispositivo actual. Tendrás que volver a iniciar sesión."
          : confirm?.session.current
            ? "Vas a cerrar la sesión de este dispositivo y deberás volver a entrar."
            : "El dispositivo dejará de tener acceso hasta un nuevo inicio de sesión."}
        onClose={() => !submitting && setConfirm(null)}
      >
        <div className="modal-actions">
          <button type="button" className="button secondary" disabled={submitting} onClick={() => setConfirm(null)}>Cancelar</button>
          <button
            type="button"
            className="button primary"
            disabled={submitting}
            onClick={() => {
              if (!confirm) return;
              const path = confirm.kind === "all"
                ? "v1/users/me/sessions"
                : `v1/users/me/sessions/${encodeURIComponent(confirm.session.familyId)}`;
              void applyRevoke(path);
            }}
          >
            {submitting ? "Cerrando…" : "Confirmar"}
          </button>
        </div>
      </Modal>
    </section>
  );
}
