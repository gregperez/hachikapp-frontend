"use client";

import { ApiError, errorMessage } from "@/lib/api";
import { sexLabel, sizeLabel, speciesLabel } from "@/lib/pets";
import {
  formatAgeMonths,
  getVisitorId,
  recordScan,
  revealContact,
  sendFinderMessage,
  tagPhotoUrl,
  type PublicTagResult,
} from "@/lib/tags";
import type { PublicContact, PublicProfile, ScanReceipt } from "@/lib/types";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const GENERIC_ERROR = "Algo falló, intenta de nuevo";
const BODY_MAX = 500;

const FIELD_ERRORS: Record<string, string> = {
  "body:required": "Escribe un mensaje",
  "body:max": "El mensaje es demasiado largo (máximo 500 caracteres)",
  "finderName:max": "El nombre es demasiado largo",
  "finderPhone:phone": "Revisa el teléfono",
  "finderPhone:max": "El teléfono es demasiado largo",
};

function fieldErrorsFrom(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (error instanceof ApiError) {
    for (const item of error.problem?.errors ?? []) {
      const message = FIELD_ERRORS[`${item.field}:${item.code}`];
      if (message && !out[item.field]) out[item.field] = message;
    }
  }
  return out;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <section className="public-card public-notice">
      <p>{children}</p>
    </section>
  );
}

export function PublicProfileView({ code, result }: { code: string; result: PublicTagResult }) {
  if (result.kind === "not_found") return <Notice>No encontramos esta placa</Notice>;
  if (result.kind === "error") return <Notice>{GENERIC_ERROR}</Notice>;
  const { view } = result;
  if (view.state === "unassigned") {
    return (
      <section className="public-card public-notice">
        <p>Esta placa aún no está activada</p>
        <a className="button primary button-large public-action" href={`/login?from=${encodeURIComponent(`/t/${code}/activar`)}`}>
          Activar
        </a>
      </section>
    );
  }
  if (view.state === "disabled" || !view.profile) return <Notice>Esta placa no está disponible</Notice>;
  return <ActiveProfile code={code} profile={view.profile} />;
}

type ContactState = "idle" | "loading" | "revealed" | "declined";

function ActiveProfile({ code, profile }: { code: string; profile: PublicProfile }) {
  const scanRef = useRef<ScanReceipt | null>(null);
  const startedRef = useRef(false);

  const ensureScan = useCallback(async (): Promise<ScanReceipt | null> => {
    if (scanRef.current) return scanRef.current;
    try {
      scanRef.current = await recordScan(code, getVisitorId());
    } catch {
      // Recording is best-effort; the profile keeps working.
    }
    return scanRef.current;
  }, [code]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void ensureScan();
  }, [ensureScan]);

  const [formOpen, setFormOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [finderName, setFinderName] = useState("");
  const [finderPhone, setFinderPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const [contactState, setContactState] = useState<ContactState>("idle");
  const [contact, setContact] = useState<PublicContact | null>(null);
  const [contactError, setContactError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setFieldErrors({});
    setFormError("");
    setSending(true);
    try {
      const scan = await ensureScan();
      if (!scan) {
        setFormError(GENERIC_ERROR);
        return;
      }
      await sendFinderMessage(scan.scanId, scan.scanToken, {
        body: body.trim(),
        ...(finderName.trim() ? { finderName: finderName.trim() } : {}),
        ...(finderPhone.trim() ? { finderPhone: finderPhone.trim() } : {}),
        website,
      });
      setSent(true);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        const errors = fieldErrorsFrom(caught);
        if (Object.keys(errors).length > 0) setFieldErrors(errors);
        else setFormError(GENERIC_ERROR);
      } else if (caught instanceof ApiError && caught.status === 429) {
        setFormError(errorMessage(caught));
      } else {
        setFormError(GENERIC_ERROR);
      }
    } finally {
      setSending(false);
    }
  }

  async function showContact() {
    if (contactState === "loading") return;
    setContactError("");
    setContactState("loading");
    try {
      const scan = await ensureScan();
      if (!scan) {
        setContactError(GENERIC_ERROR);
        setContactState("idle");
        return;
      }
      setContact(await revealContact(scan.scanId, scan.scanToken));
      setContactState("revealed");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setContactState("declined");
        return;
      }
      setContactError(caught instanceof ApiError && caught.status === 429 ? errorMessage(caught) : GENERIC_ERROR);
      setContactState("idle");
    }
  }

  const photo = tagPhotoUrl(profile.photoUrl);
  const important = [...(profile.allergies ?? []), ...(profile.specialConditions ?? [])];
  const family = [profile.ownerFirstName, profile.secondOwnerFirstName].filter(Boolean).join(" y ");
  const age = formatAgeMonths(profile.ageMonths);
  const rows: Array<[string, string | undefined]> = [
    ["Especie", profile.species ? speciesLabel(profile.species) : undefined],
    ["Raza", profile.breed],
    ["Color", profile.color],
    ["Sexo", profile.sex ? sexLabel(profile.sex) : undefined],
    ["Tamaño", profile.size ? sizeLabel(profile.size) : undefined],
    ["Edad", age || undefined],
    ["Temperamento", profile.temperament],
    ["Señas particulares", profile.distinctiveFeatures],
    ["Cirugías", profile.surgeries?.length ? profile.surgeries.join(", ") : undefined],
  ];
  const visibleRows = rows.filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <article className="public-profile">
      <header className="public-hero">
        {photo && (
          // Same-origin proxy URL; next/image would add nothing for a one-off photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="public-photo" src={photo} alt={`Foto de ${profile.name}`} />
        )}
        <h1>Hola, soy {profile.name}</h1>
      </header>

      {important.length > 0 && (
        <section className="public-card public-important" aria-labelledby="public-important-title">
          <h2 id="public-important-title">Importante</h2>
          <ul>
            {important.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="public-actions">
        {sent ? (
          <p className="public-thanks" role="status">¡Gracias! Su familia recibirá tu mensaje</p>
        ) : formOpen ? (
          <form className="public-card public-form" onSubmit={submit} noValidate>
            <label htmlFor="public-body">Tu mensaje</label>
            <textarea
              id="public-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={BODY_MAX}
              rows={4}
              required
              aria-invalid={fieldErrors.body ? true : undefined}
              aria-describedby={fieldErrors.body ? "public-body-error" : undefined}
            />
            <span className="public-counter">{body.length}/{BODY_MAX}</span>
            {fieldErrors.body && <span id="public-body-error" className="field-error">{fieldErrors.body}</span>}

            <label htmlFor="public-name">Tu nombre (opcional)</label>
            <input id="public-name" value={finderName} onChange={(event) => setFinderName(event.target.value)} maxLength={80} autoComplete="name" />
            {fieldErrors.finderName && <span className="field-error">{fieldErrors.finderName}</span>}

            <label htmlFor="public-phone">Tu teléfono (opcional)</label>
            <input id="public-phone" type="tel" value={finderPhone} onChange={(event) => setFinderPhone(event.target.value)} autoComplete="tel" aria-invalid={fieldErrors.finderPhone ? true : undefined} />
            {fieldErrors.finderPhone && <span className="field-error">{fieldErrors.finderPhone}</span>}

            <div className="public-hp" aria-hidden="true">
              <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            {formError && <p className="public-error" role="alert">{formError}</p>}
            <button className="button primary button-large public-action" type="submit" disabled={sending}>
              {sending ? "Enviando..." : "Enviar mensaje"}
            </button>
          </form>
        ) : (
          <button className="button primary button-large public-action" type="button" onClick={() => setFormOpen(true)}>
            Avisar a mi familia
          </button>
        )}

        {profile.canContact && contactState !== "revealed" && contactState !== "declined" && (
          <button className="button secondary button-large public-action" type="button" onClick={showContact} disabled={contactState === "loading"}>
            Llamar / WhatsApp
          </button>
        )}
        {contactState === "revealed" && contact && (
          <div className="public-contact">
            <a className="button secondary button-large public-action" href={`tel:${contact.phone}`}>
              Llamar {contact.phone}
            </a>
            <a className="button secondary button-large public-action" href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          </div>
        )}
        {contactState === "declined" && <p className="public-note" role="status">Su familia prefiere que le dejes un mensaje</p>}
        {contactError && <p className="public-error" role="alert">{contactError}</p>}
      </section>

      {(visibleRows.length > 0 || family || profile.comuna) && (
        <section className="public-card">
          <dl className="public-data">
            {visibleRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {family && <p className="public-family">Mi familia: {family}</p>}
          {profile.comuna && (
            <dl className="public-data">
              <div>
                <dt>Comuna</dt>
                <dd>{profile.comuna}</dd>
              </div>
            </dl>
          )}
        </section>
      )}
    </article>
  );
}
