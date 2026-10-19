"use client";

import { LoadingState, Notice } from "@/components/ui";
import { ApiError, api, dataOf, errorMessage } from "@/lib/api";
import { formatChileDate } from "@/lib/tags";
import type { ApiEnvelope, CursorPage, TagBatch } from "@/lib/types";
import { Download, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

const QUANTITY_ERROR = "Ingresa un número entre 1 y 1000";
const LABEL_ERROR = "Ponle un nombre al lote (hasta 80 caracteres)";

function CsvLink({ batch }: { batch: TagBatch }) {
  return (
    <a className="button secondary compact" href={`/api/backend/v1/admin/tag-batches/${batch.id}/codes.csv`} download={`placas-${batch.id}.csv`}>
      <Download size={14} /> Descargar CSV
    </a>
  );
}

export function TagBatchesAdmin({ canCreate }: { canCreate: boolean }) {
  const [batches, setBatches] = useState<TagBatch[] | null>(null);
  const [next, setNext] = useState<string | undefined>();
  const [created, setCreated] = useState<TagBatch[]>([]);
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("");
  const [errors, setErrors] = useState<{ label?: string; quantity?: string }>({});
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    try {
      const page = dataOf(await api<ApiEnvelope<CursorPage<TagBatch>>>(`v1/admin/tag-batches?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`));
      setBatches((current) => (cursor ? [...(current ?? []), ...page.data] : page.data));
      setNext(page.hasNext ? page.nextCursor : undefined);
    } catch (caught) {
      setNotice(errorMessage(caught));
      setBatches((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    const amount = Number(quantity);
    const found: { label?: string; quantity?: string } = {};
    if (!trimmed || trimmed.length > 80) found.label = LABEL_ERROR;
    if (!/^\d+$/.test(quantity.trim()) || amount < 1 || amount > 1000) found.quantity = QUANTITY_ERROR;
    setErrors(found);
    setNotice("");
    if (found.label || found.quantity) return;
    setSubmitting(true);
    try {
      const batch = dataOf(await api<ApiEnvelope<TagBatch>>("v1/admin/tag-batches", {
        method: "POST",
        body: JSON.stringify({ label: trimmed, quantity: amount }),
      }));
      setCreated((current) => [batch, ...current]);
      setLabel("");
      setQuantity("");
    } catch (caught) {
      const fields = caught instanceof ApiError ? caught.problem?.errors : undefined;
      if (fields?.length) {
        setErrors({
          label: fields.some((f) => f.field === "label") ? LABEL_ERROR : undefined,
          quantity: fields.some((f) => f.field === "quantity") ? QUANTITY_ERROR : undefined,
        });
      } else {
        setNotice(errorMessage(caught));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const shown = [...created, ...(batches ?? []).filter((b) => !created.some((c) => c.id === b.id))];

  return (
    <>
      <Notice message={notice} kind="error" />
      {canCreate && (
        <section className="panel form-panel">
          <form className="modal-form" onSubmit={submit} noValidate>
            <div className="form-grid two-columns">
              <label>Nombre del lote
                <input value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} aria-invalid={errors.label ? true : undefined} placeholder="Ej: Feria de adopción" />
                {errors.label && <span className="field-error" role="alert">{errors.label}</span>}
              </label>
              <label>Cantidad
                <input value={quantity} inputMode="numeric" onChange={(event) => setQuantity(event.target.value)} aria-invalid={errors.quantity ? true : undefined} placeholder="1 a 1000" />
                {errors.quantity && <span className="field-error" role="alert">{errors.quantity}</span>}
              </label>
            </div>
            <div className="form-submit">
              <button type="submit" className="button primary" disabled={submitting}><Plus size={16} /> Crear lote</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        {!batches ? (
          <LoadingState />
        ) : shown.length === 0 ? (
          <div className="empty-state"><p>Aún no hay lotes de placas.</p></div>
        ) : (
          <ul className="session-list">
            {shown.map((batch) => (
              <li key={batch.id} className="session-row">
                <div>
                  <strong>{batch.label}</strong>
                  <p><span>{batch.quantity} placas</span><span>{formatChileDate(batch.createdAt)}</span></p>
                </div>
                <CsvLink batch={batch} />
              </li>
            ))}
          </ul>
        )}
        {next && (
          <div className="form-submit">
            <button type="button" className="button ghost" onClick={() => void load(next)}>Ver más</button>
          </div>
        )}
      </section>
    </>
  );
}
