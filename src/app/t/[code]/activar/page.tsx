"use client";

import { PetAvatar } from "@/components/pet-avatar";
import { LoadingState, Notice } from "@/components/ui";
import { api, dataOf, errorMessage } from "@/lib/api";
import { speciesLabel } from "@/lib/pets";
import { groupTagCode, normalizeTagCode } from "@/lib/tags";
import type { ApiEnvelope, Pet } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ActivateTagPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const raw = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeTagCode(decodeURIComponent(raw ?? ""));

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(code !== null);
  const [error, setError] = useState("");
  const [petId, setPetId] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (code === null) return;
    let cancelled = false;
    (async () => {
      try {
        const list = dataOf(await api<ApiEnvelope<Pet[]>>("v1/pets"));
        if (cancelled) return;
        setPets(list);
        if (list.length === 1) setPetId(list[0].id);
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  async function activate() {
    if (code === null || !petId || sending) return;
    setSending(true);
    setError("");
    try {
      await api<unknown>(`v1/tags/${encodeURIComponent(code)}/activate`, {
        method: "POST",
        body: JSON.stringify({ petId }),
      });
      router.push(`/dashboard/pets/${petId}?tag=activated`);
    } catch (caught) {
      setError(errorMessage(caught));
      setSending(false);
    }
  }

  if (code === null) {
    return (
      <section className="public-card public-notice">
        <p>Este código no es válido</p>
        <Link href="/dashboard/pets" className="button">Volver a mis mascotas</Link>
      </section>
    );
  }

  if (loading) return <LoadingState />;

  if (pets.length === 0 && !error) {
    return (
      <section className="public-card public-notice">
        <p>Para activar esta placa primero necesitas la ficha de tu mascota.</p>
        <Link href="/dashboard/pets/new" className="button primary">Crear la ficha de tu mascota</Link>
      </section>
    );
  }

  return (
    <section className="public-card activate-tag">
      <h1>Activa tu placa</h1>
      <p className="activate-code" aria-label="Código de la placa">{groupTagCode(code)}</p>
      <Notice message={error} kind="error" />
      {pets.length > 0 && (
        <fieldset className="activate-pets">
          <legend>¿A qué mascota la vinculas?</legend>
          {pets.map((pet) => (
            <label key={pet.id} className={`activate-pet${petId === pet.id ? " selected" : ""}`}>
              <input type="radio" name="pet" value={pet.id} checked={petId === pet.id} onChange={() => setPetId(pet.id)} />
              <PetAvatar pet={pet} />
              <span><strong>{pet.name}</strong> <small>{speciesLabel(pet.species)}</small></span>
            </label>
          ))}
        </fieldset>
      )}
      {pets.length > 0 && (
        <button type="button" className="button primary public-action" disabled={!petId || sending} onClick={() => void activate()}>
          {sending ? "Vinculando…" : "Vincular placa"}
        </button>
      )}
    </section>
  );
}
