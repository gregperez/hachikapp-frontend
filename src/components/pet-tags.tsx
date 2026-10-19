"use client";

import { LoadingState, Notice } from "@/components/ui";
import { api, dataOf, errorMessage } from "@/lib/api";
import { formatChileDate, groupTagCode, tagKindLabel, tagQrSvg, tagStatusLabel } from "@/lib/tags";
import type { ApiEnvelope, PetTag } from "@/lib/types";
import { Copy, Download, Plus, Power } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const MAX_ACTIVE = 5;

export function PetTags({ petId }: { petId: string }) {
  const [tags, setTags] = useState<PetTag[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState<{ id: string; url: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const envelope = await api<ApiEnvelope<PetTag[]>>(`v1/pets/${petId}/tags`);
      setTags(dataOf(envelope) ?? []);
      setError("");
    } catch (caught) {
      setError(errorMessage(caught));
      setTags((current) => current ?? []);
    }
  }, [petId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const createDigital = () => run(() => api(`v1/pets/${petId}/tags`, { method: "POST" }));
  const disable = (tag: PetTag) => run(async () => {
    setConfirmId(null);
    await api(`v1/pets/${petId}/tags/${tag.id}/disable`, { method: "POST" });
  });

  async function copyLink(tag: PetTag) {
    setManualUrl(null);
    try {
      await navigator.clipboard.writeText(tag.url);
      setCopied(tag.id);
      setTimeout(() => setCopied((current) => (current === tag.id ? null : current)), 2500);
    } catch {
      setManualUrl({ id: tag.id, url: tag.url });
    }
  }

  async function downloadQr(tag: PetTag) {
    setQrError(null);
    try {
      const svg = await tagQrSvg(tag.url);
      const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `placa-${tag.code}.svg`;
      link.click();
      // Safari needs a moment to start the download before the blob URL is released.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setQrError(tag.id);
    }
  }

  if (!tags) return <section className="panel"><LoadingState /></section>;

  const activeCount = tags.filter((tag) => tag.status === "active").length;
  const full = activeCount >= MAX_ACTIVE;

  return (
    <section className="panel pet-tags">
      <div className="panel-heading">
        <div><h2>Placas</h2><p>Lo que cuelga del collar y abre su ficha pública</p></div>
        <button type="button" className="button primary compact" onClick={createDigital} disabled={full || busy}>
          <Plus size={16} /> Crear placa digital
        </button>
      </div>
      <div className="pet-section-body">
        {full && <p className="pet-section-hint">Ya tiene 5 placas activas. Desactiva una para crear otra.</p>}
        <Notice message={error} kind="error" />
        {tags.length === 0 ? (
          <p className="pet-section-empty">Esta mascota aún no tiene placas. Activa una placa física escaneándola, o crea una placa digital.</p>
        ) : (
          <ul className="pet-tag-list">
            {tags.map((tag) => (
              <li key={tag.id} className="pet-tag-row">
                <div className="pet-tag-main">
                  <strong className="pet-tag-code">{groupTagCode(tag.code)}</strong>
                  <p>
                    <span>{tagKindLabel(tag.kind)}</span>
                    <span className={`status-badge ${tag.status === "active" ? "success" : "neutral"}`}><i />{tagStatusLabel(tag.status)}</span>
                    {tag.activatedAt && <span>Activada el {formatChileDate(tag.activatedAt)}</span>}
                  </p>
                  {manualUrl?.id === tag.id && (
                    <input className="pet-tag-url" readOnly value={manualUrl.url} aria-label="Enlace de la placa" onFocus={(event) => event.currentTarget.select()} />
                  )}
                  {qrError === tag.id && <p className="pet-section-hint" role="alert">No pudimos generar el QR, intenta de nuevo</p>}
                </div>
                {tag.status === "active" && (
                  <div className="pet-tag-actions">
                    {confirmId === tag.id ? (
                      <div className="pet-tag-confirm" role="group">
                        <span>¿Desactivar esta placa? Quien la escanee ya no verá la ficha. No podrás volver a activarla.</span>
                        <button type="button" className="button danger compact" onClick={() => disable(tag)} disabled={busy}>Sí, desactivar</button>
                        <button type="button" className="button secondary compact" onClick={() => setConfirmId(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="button secondary compact" onClick={() => copyLink(tag)}><Copy size={14} /> Copiar enlace</button>
                        {copied === tag.id && <span className="pet-tag-copied" role="status">Enlace copiado</span>}
                        <button type="button" className="button secondary compact" onClick={() => downloadQr(tag)}><Download size={14} /> Descargar QR</button>
                        <button type="button" className="button ghost compact" onClick={() => setConfirmId(tag.id)} disabled={busy}><Power size={14} /> Desactivar</button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
