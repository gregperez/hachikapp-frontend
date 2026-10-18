"use client";

import { BrandMark } from "@/components/brand-mark";
import { LoadingState, Notice, PageHeader } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { useSettings } from "@/components/settings-provider";
import { ApiError, api, dataOf, errorMessage } from "@/lib/api";
import { canAccess } from "@/lib/permissions";
import { ALLOWED_LOCALES, DEFAULT_PUBLIC_SETTINGS, emptyAppSettings, settingsEqual, validateSettingsDraft } from "@/lib/settings";
import { ENTITY_IDS, type ApiEnvelope, type ApiProblem, type AppSettings } from "@/lib/types";
import { Eye, Save, Settings2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

function fieldErrorsFromProblem(problem?: ApiProblem): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const item of problem?.errors || []) {
    if (item.code === "protected") errors[item.field] = "Esta clave no es configurable desde la consola.";
    else if (item.code === "unknown") errors[item.field] = "Esta clave no forma parte del esquema.";
    else errors[item.field] = "Revisa este campo.";
  }
  return errors;
}

export default function GeneralSettingsPage() {
  const { user } = useSession();
  const { refresh: refreshBranding } = useSettings();
  const canRead = canAccess(user, { entity: ENTITY_IDS.SETTINGS, action: "read" });
  const canUpdate = canAccess(user, { entity: ENTITY_IDS.SETTINGS, action: "update" });
  const [current, setCurrent] = useState<AppSettings>(emptyAppSettings());
  const [draft, setDraft] = useState<AppSettings>(emptyAppSettings());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const dirty = !settingsEqual(current, draft);

  const load = useCallback(async (keepNotice = false) => {
    setLoading(true);
    try {
      const envelope = await api<ApiEnvelope<AppSettings>>("v1/settings");
      const data = dataOf(envelope);
      setCurrent(data);
      setDraft(data);
      if (!keepNotice) setNotice(null);
      setFieldErrors({});
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    void load();
  }, [canRead, load]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!canRead) {
    return (
      <>
        <PageHeader eyebrow="ADMINISTRACIÓN" title="Configuración" description="Branding y localización visibles de la consola." />
        <div className="empty-state">
          <Settings2 size={28} />
          <p>No tienes permiso para consultar la configuración general.</p>
        </div>
      </>
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const local = validateSettingsDraft(draft);
    if (Object.keys(local).length > 0) {
      setFieldErrors(local);
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const envelope = await api<ApiEnvelope<AppSettings>>("v1/settings", {
        method: "PUT",
        body: JSON.stringify({
          version: current.version,
          displayName: draft.displayName.trim(),
          logoUrl: draft.logoUrl.trim(),
          defaultLocale: draft.defaultLocale,
        }),
      });
      const saved = dataOf(envelope);
      setCurrent(saved);
      setDraft(saved);
      setNotice({ message: "La configuración se actualizó.", kind: "success" });
      await refreshBranding();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setNotice({ message: "Alguien actualizó la configuración. Recargamos la versión actual.", kind: "error" });
        await load(true);
      } else if (caught instanceof ApiError && caught.status === 422) {
        setFieldErrors(fieldErrorsFromProblem(caught.problem));
        setNotice({ message: errorMessage(caught), kind: "error" });
      } else {
        setNotice({ message: errorMessage(caught), kind: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) return;
    setDraft(current);
    setFieldErrors({});
  }

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRACIÓN"
        title="Configuración"
        description="Nombre visible, logo y locale por defecto. JWT, base de datos y secretos no se editan aquí."
      />
      <Notice message={notice?.message} kind={notice?.kind} />

      {loading ? (
        <LoadingState />
      ) : notice?.kind === "error" && current.version === 1 && current.displayName === DEFAULT_PUBLIC_SETTINGS.displayName && !dirty ? (
        <div className="empty-state">
          <p>No pudimos cargar la configuración.</p>
          <button type="button" className="button secondary" onClick={() => void load()}>Reintentar</button>
        </div>
      ) : (
        <div className="settings-layout">
          <section className="panel form-panel">
            <form className="modal-form" onSubmit={save}>
              <label>
                Nombre visible
                <input
                  value={draft.displayName}
                  onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                  disabled={!canUpdate}
                  maxLength={80}
                  required
                />
                {fieldErrors.displayName && <span className="field-error">{fieldErrors.displayName}</span>}
              </label>
              <label>
                URL del logo
                <input
                  value={draft.logoUrl}
                  onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })}
                  disabled={!canUpdate}
                  placeholder="https://… o /logo.svg"
                />
                {fieldErrors.logoUrl && <span className="field-error">{fieldErrors.logoUrl}</span>}
              </label>
              <label>
                Locale por defecto
                <select
                  value={draft.defaultLocale}
                  onChange={(event) => setDraft({ ...draft, defaultLocale: event.target.value })}
                  disabled={!canUpdate}
                >
                  {ALLOWED_LOCALES.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
                </select>
                {fieldErrors.defaultLocale && <span className="field-error">{fieldErrors.defaultLocale}</span>}
              </label>
              {Object.entries(fieldErrors).filter(([field]) => !["displayName", "logoUrl", "defaultLocale"].includes(field)).map(([field, message]) => (
                <p key={field} className="field-error">{field}: {message}</p>
              ))}
              <p className="form-hint">Versión {current.version}. Un conflicto 409 recarga el formulario.</p>
              {canUpdate && (
                <div className="form-submit">
                  <button type="button" className="button ghost" disabled={!dirty || saving} onClick={discard}>Descartar</button>
                  <button type="submit" className="button primary" disabled={!dirty || saving}>
                    <Save size={16} /> {saving ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              )}
            </form>
          </section>
          <section className="panel settings-preview">
            <div className="panel-heading icon-heading">
              <span className="metric-icon indigo"><Eye size={20} /></span>
              <div><h2>Vista previa</h2><p>Así se verá el branding con los valores actuales del formulario.</p></div>
            </div>
            <div className="settings-preview-card">
              <BrandMark name={draft.displayName || DEFAULT_PUBLIC_SETTINGS.displayName} logoUrl={draft.logoUrl} light />
              <p>Locale {draft.defaultLocale}</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
