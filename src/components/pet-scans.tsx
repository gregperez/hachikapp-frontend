"use client";

import { LoadingState, Notice } from "@/components/ui";
import { api, dataOf, errorMessage } from "@/lib/api";
import { deviceLabel, formatChileDateTime, groupTagCode, telHref } from "@/lib/tags";
import type { ApiEnvelope, CursorPage, ScanWithMessages } from "@/lib/types";
import { Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 10;

export function PetScans({ petId }: { petId: string }) {
  const [scans, setScans] = useState<ScanWithMessages[] | null>(null);
  const [next, setNext] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (cursor?: string) => {
    const query = `v1/pets/${petId}/scans?limit=${PAGE_SIZE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    try {
      const page = dataOf(await api<ApiEnvelope<CursorPage<ScanWithMessages>>>(query));
      setScans((current) => (cursor ? [...(current ?? []), ...page.data] : page.data));
      setNext(page.hasNext ? page.nextCursor : undefined);
      setError("");
    } catch (caught) {
      setError(errorMessage(caught));
      setScans((current) => current ?? []);
    }
  }, [petId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    await load(next);
    setLoadingMore(false);
  }

  if (!scans) return <section className="panel"><LoadingState /></section>;

  return (
    <section className="panel pet-scans">
      <div className="panel-heading"><div><h2>Últimos escaneos</h2><p>Quién encontró sus placas y qué te dejó dicho</p></div></div>
      <div className="pet-section-body">
        <Notice message={error} kind="error" />
        {scans.length === 0 ? (
          <p className="pet-section-empty">Aún nadie ha escaneado sus placas</p>
        ) : (
          <ul className="pet-scan-list">
            {scans.map((scan) => (
              <li key={scan.id} className="pet-scan">
                <p className="pet-scan-meta">
                  <strong>{formatChileDateTime(scan.scannedAt)}</strong>
                  <span>{deviceLabel(scan.userAgentFamily)}</span>
                  <span>{groupTagCode(scan.tagCode)}</span>
                  {scan.phoneRevealedAt && <span className="status-badge warning"><Eye size={12} /> Vio tu número</span>}
                </p>
                {scan.messages.map((message) => (
                  <blockquote key={message.id} className="pet-scan-message">
                    <p>{message.body}</p>
                    {(message.finderName || message.finderPhone) && (
                      <footer>
                        {message.finderName && <span>{message.finderName}</span>}
                        {message.finderPhone && <a href={telHref(message.finderPhone)}>{message.finderPhone}</a>}
                      </footer>
                    )}
                  </blockquote>
                ))}
              </li>
            ))}
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
