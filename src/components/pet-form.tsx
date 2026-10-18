"use client";

import { Notice } from "@/components/ui";
import {
  PUBLIC_FIELD_GROUPS,
  SEX_OPTIONS,
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
  PET_FORM_STEPS,
  VISIBILITY_OPTIONS,
  errorsForStep,
  sanitizeWeightInput,
  stepOfField,
  validatePetForm,
  withoutStep,
  type PetForm as PetFormValues,
} from "@/lib/pets";
import type { PetPublicField, PetVisibility } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Eye, HeartPulse, IdCard, Plus, Save, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useState } from "react";

type Props = {
  initial: PetFormValues;
  /** "create" walks the steps in order; "edit" lets the owner jump between them and save anytime. */
  mode: "create" | "edit";
  submitLabel: string;
  cancelHref: string;
  onSubmit: (values: PetFormValues) => Promise<{ fieldErrors?: Record<string, string>; message?: string } | void>;
};

export function PetForm({ initial, mode, submitLabel, cancelHref, onSubmit }: Props) {
  const [values, setValues] = useState<PetFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(1);
  const today = new Date().toISOString().slice(0, 10);
  const wizard = mode === "create";
  const isLast = step === PET_FORM_STEPS.length - 1;
  const stepsWithErrors = new Set(Object.keys(errors).map(stepOfField));

  function set<K extends keyof PetFormValues>(key: K, value: PetFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function setVisibility(field: PetPublicField, visibility: PetVisibility) {
    setValues((current) => ({ ...current, publicVisibility: { ...current.publicVisibility, [field]: visibility } }));
  }

  function goTo(next: number) {
    setStep(next);
    setVisited((current) => Math.max(current, next + 1));
    setMessage("");
    window.requestAnimationFrame(() => {
      document.getElementById("pet-form-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showErrors(found: Record<string, string>, text: string) {
    setErrors(found);
    setMessage(text);
    const first = Object.keys(found)[0];
    if (first) {
      setStep(stepOfField(first));
      focusFirstError(found);
    }
  }

  function next() {
    const stepErrors = errorsForStep(validatePetForm(values), step);
    if (Object.keys(stepErrors).length > 0) {
      showErrors(stepErrors, "Completa los datos marcados para continuar.");
      return;
    }
    setErrors((current) => withoutStep(current, step));
    goTo(step + 1);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (wizard && !isLast) {
      next();
      return;
    }
    const local = validatePetForm(values);
    if (Object.keys(local).length > 0) {
      showErrors(local, "Revisa los datos marcados.");
      return;
    }
    setErrors({});
    setMessage("");
    setSaving(true);
    try {
      const result = await onSubmit(values);
      if (result?.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
        showErrors(result.fieldErrors, result.message || "Revisa los datos marcados.");
      } else if (result?.message) {
        setMessage(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const fieldProps = (name: string) => ({
    id: fieldId(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${fieldId(name)}-error` : undefined,
  });

  return (
    <form className="pet-form" onSubmit={submit} noValidate>
      <nav id="pet-form-top" className="pet-steps" aria-label="Secciones de la ficha">
        <p className="pet-steps-progress">Paso {step + 1} de {PET_FORM_STEPS.length}</p>
        <ol>
          {PET_FORM_STEPS.map((info, index) => {
            const completed = wizard && (index < step || index < visited - 1);
            const state = index === step ? "current" : stepsWithErrors.has(index) ? "error" : completed ? "done" : "pending";
            const reachable = !wizard || index < visited;
            return (
              <li key={info.id} className={`pet-step ${state}`}>
                <button type="button" onClick={() => reachable && goTo(index)} disabled={!reachable} aria-current={index === step ? "step" : undefined}>
                  <span className="pet-step-number">{state === "done" ? <Check size={14} strokeWidth={3} /> : index + 1}</span>
                  <span className="pet-step-copy"><strong>{info.title}</strong><small>{info.hint}</small></span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <Notice message={message} kind="error" />

      {step === 0 && (
        <section className="panel form-panel">
          <div className="panel-heading icon-heading">
            <span className="metric-icon indigo"><IdCard size={20} /></span>
            <div><h2>Identificación</h2><p>Los datos que aparecen en su carnet.</p></div>
          </div>
          <div className="modal-form">
            <div className="form-grid two-columns">
              <label>Nombre *
                <input {...fieldProps("name")} value={values.name} maxLength={60} onChange={(event) => set("name", event.target.value)} placeholder="Ej: Luna" />
                <FieldError name="name" errors={errors} />
              </label>
              <label>Especie *
                <select {...fieldProps("species")} value={values.species} onChange={(event) => set("species", event.target.value as PetFormValues["species"])}>
                  <option value="" disabled>Elige una opción</option>
                  {SPECIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <FieldError name="species" errors={errors} />
              </label>
              <label>Raza
                <input {...fieldProps("breed")} value={values.breed} maxLength={60} onChange={(event) => set("breed", event.target.value)} placeholder="Ej: Mestiza" />
                <FieldError name="breed" errors={errors} />
              </label>
              <label>Color
                <input {...fieldProps("color")} value={values.color} maxLength={60} onChange={(event) => set("color", event.target.value)} placeholder="Ej: Café con blanco" />
                <FieldError name="color" errors={errors} />
              </label>
              <label>Sexo
                <select {...fieldProps("sex")} value={values.sex} onChange={(event) => set("sex", event.target.value as PetFormValues["sex"])}>
                  {SEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label>Fecha de nacimiento
                <input {...fieldProps("birthDate")} type="date" value={values.birthDate} max={today} min="1980-01-01" onChange={(event) => set("birthDate", event.target.value)} />
                <FieldError name="birthDate" errors={errors} />
              </label>
              <label>Peso (kg)
                <input {...fieldProps("weightKg")} inputMode="decimal" value={values.weightKg} maxLength={6} onChange={(event) => set("weightKg", sanitizeWeightInput(event.target.value))} placeholder="Ej: 12,5" />
                <span className="form-hint inline">El peso inicial; se actualizará con los controles.</span>
                <FieldError name="weightKg" errors={errors} />
              </label>
              <label>Tamaño
                <select {...fieldProps("size")} value={values.size} onChange={(event) => set("size", event.target.value as PetFormValues["size"])}>
                  {SIZE_OPTIONS.map((option) => <option key={option.value || "unset"} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <label>Número de microchip
              <input {...fieldProps("chipNumber")} inputMode="numeric" value={values.chipNumber} maxLength={20} onChange={(event) => set("chipNumber", event.target.value)} placeholder="15 dígitos, ej: 900123456789012" />
              <span className="form-hint inline">En Chile el microchip es obligatorio (Ley 21.020). Hachikapp lo complementa, no lo reemplaza.</span>
              <FieldError name="chipNumber" errors={errors} />
            </label>
            <label>Rasgos característicos
              <textarea {...fieldProps("distinctiveFeatures")} value={values.distinctiveFeatures} maxLength={500} rows={3} onChange={(event) => set("distinctiveFeatures", event.target.value)} placeholder="Ej: mancha blanca en el pecho, oreja izquierda caída" />
              <FieldError name="distinctiveFeatures" errors={errors} />
            </label>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="panel form-panel">
          <div className="panel-heading icon-heading">
            <span className="metric-icon amber"><HeartPulse size={20} /></span>
            <div><h2>Salud</h2><p>Lo importante para cuidarla bien, también si alguien la encuentra.</p></div>
          </div>
          <div className="modal-form">
            <TagInput label="Alergias" name="health.allergies" placeholder="Ej: no puede comer atún" items={values.allergies} errors={errors} onChange={(items) => set("allergies", items)} />
            <TagInput label="Condiciones especiales" name="health.specialConditions" placeholder="Ej: sorda" items={values.specialConditions} errors={errors} onChange={(items) => set("specialConditions", items)} />
            <TagInput label="Cirugías" name="health.surgeries" placeholder="Ej: esterilizada" items={values.surgeries} errors={errors} onChange={(items) => set("surgeries", items)} />
            <label>Temperamento
              <textarea {...fieldProps("health.temperament")} value={values.temperament} maxLength={300} rows={2} onChange={(event) => set("temperament", event.target.value)} placeholder="Ej: tímida con extraños, se acerca si le hablas bajito" />
              <FieldError name="health.temperament" errors={errors} />
            </label>
          </div>
        </section>
      )}

      {step === 2 && (
        <div className="pet-form-columns">
          <section className="panel form-panel">
            <div className="panel-heading icon-heading">
              <span className="metric-icon green"><UserRound size={20} /></span>
              <div><h2>Dueño registrado en el chip</h2><p>Contacto principal de la mascota.</p></div>
            </div>
            <div className="modal-form">
              <label>Nombre completo *
                <input {...fieldProps("owner.fullName")} value={values.ownerFullName} maxLength={100} onChange={(event) => set("ownerFullName", event.target.value)} autoComplete="name" />
                <FieldError name="owner.fullName" errors={errors} />
              </label>
              <div className="form-grid two-columns">
                <label>Teléfono *
                  <input {...fieldProps("owner.phone")} type="tel" value={values.ownerPhone} maxLength={20} onChange={(event) => set("ownerPhone", event.target.value)} placeholder="+56 9 1234 5678" autoComplete="tel" />
                  <FieldError name="owner.phone" errors={errors} />
                </label>
                <label>Teléfono alternativo
                  <input {...fieldProps("owner.phoneAlt")} type="tel" value={values.ownerPhoneAlt} maxLength={20} onChange={(event) => set("ownerPhoneAlt", event.target.value)} placeholder="Opcional" />
                  <FieldError name="owner.phoneAlt" errors={errors} />
                </label>
              </div>
              <label>Comuna
                <input {...fieldProps("owner.comuna")} value={values.ownerComuna} maxLength={60} onChange={(event) => set("ownerComuna", event.target.value)} placeholder="Ej: Ñuñoa" />
                <FieldError name="owner.comuna" errors={errors} />
              </label>
              <label>Dirección
                <input {...fieldProps("owner.address")} value={values.ownerAddress} maxLength={200} onChange={(event) => set("ownerAddress", event.target.value)} autoComplete="street-address" />
                <span className="form-hint inline">Nunca se muestra en el perfil público.</span>
                <FieldError name="owner.address" errors={errors} />
              </label>
            </div>
          </section>

          <section className="panel form-panel">
            <div className="panel-heading icon-heading">
              <span className="metric-icon blue"><Users size={20} /></span>
              <div><h2>Segundo dueño</h2><p>Opcional: otra persona a quien contactar.</p></div>
            </div>
            <div className="modal-form">
              <label>Nombre
                <input {...fieldProps("secondOwner.fullName")} value={values.secondOwnerFullName} maxLength={100} onChange={(event) => set("secondOwnerFullName", event.target.value)} />
                <FieldError name="secondOwner.fullName" errors={errors} />
              </label>
              <label>Teléfono
                <input {...fieldProps("secondOwner.phone")} type="tel" value={values.secondOwnerPhone} maxLength={20} onChange={(event) => set("secondOwnerPhone", event.target.value)} placeholder="+56 9 8765 4321" />
                <FieldError name="secondOwner.phone" errors={errors} />
              </label>
            </div>
          </section>
        </div>
      )}

      {step === 3 && (
        <section className="panel form-panel">
          <div className="panel-heading icon-heading">
            <span className="metric-icon indigo"><Eye size={20} /></span>
            <div>
              <h2>Perfil público</h2>
              <p>Quien encuentre a tu mascota puede contactarte. Tú decides qué ve.</p>
            </div>
          </div>
          <div className="visibility-intro">
            Esto es lo que verá quien escanee su Hachikapp Tag. “Solo en modo perdido” se muestra cuando
            avisas que se perdió. Tu dirección, tus teléfonos y el número de chip nunca son públicos.
          </div>
          <div className="visibility-groups">
            {PUBLIC_FIELD_GROUPS.map((group) => (
              <fieldset key={group.title} className="visibility-group">
                <legend>{group.title}</legend>
                {group.fields.map((info) => (
                  <div className="visibility-row" key={info.field}>
                    <div>
                      <strong id={`vis-${info.field}`}>{info.label}</strong>
                      {info.hint && <small>{info.hint}</small>}
                    </div>
                    <div className="segmented" role="radiogroup" aria-labelledby={`vis-${info.field}`}>
                      {VISIBILITY_OPTIONS.map((option) => (
                        <label key={option.value} className={values.publicVisibility[info.field] === option.value ? "selected" : ""}>
                          <input
                            type="radio"
                            name={`visibility-${info.field}`}
                            value={option.value}
                            checked={values.publicVisibility[info.field] === option.value}
                            onChange={() => setVisibility(info.field, option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
            ))}
          </div>
        </section>
      )}

      <div className="pet-form-actions">
        {step > 0 ? (
          <button type="button" className="button secondary" onClick={() => goTo(step - 1)}><ArrowLeft size={16} /> Anterior</button>
        ) : (
          <Link href={cancelHref} className="button secondary">Cancelar</Link>
        )}
        <span className="pet-form-actions-spacer" />
        {!wizard && !isLast && (
          <button type="button" className="button secondary" onClick={() => goTo(step + 1)}>Siguiente <ArrowRight size={16} /></button>
        )}
        {wizard && !isLast ? (
          <button type="submit" className="button primary">Siguiente <ArrowRight size={16} /></button>
        ) : (
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? <span className="spinner spinner-light" /> : <Save size={17} />} {saving ? "Guardando…" : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}

function fieldId(name: string) {
  return `pet-${name.replace(/\./g, "-")}`;
}

function focusFirstError(errors: Record<string, string>) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  window.requestAnimationFrame(() => document.getElementById(fieldId(first))?.focus());
}

function FieldError({ name, errors }: { name: string; errors: Record<string, string> }) {
  if (!errors[name]) return null;
  return <span className="field-error" id={`${fieldId(name)}-error`} role="alert">{errors[name]}</span>;
}

function TagInput({ label, name, placeholder, items, errors, onChange }: {
  label: string;
  name: string;
  placeholder: string;
  items: string[];
  errors: Record<string, string>;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.replace(/\s+/g, " ").trim();
    if (!value) return;
    if (!items.some((item) => item.toLowerCase() === value.toLowerCase())) onChange([...items, value]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className="tag-field">
      <label htmlFor={fieldId(name)}>{label}</label>
      {items.length > 0 && (
        <ul className="tag-list">
          {items.map((item) => (
            <li key={item} className="tag">
              {item}
              <button type="button" onClick={() => onChange(items.filter((value) => value !== item))} aria-label={`Quitar ${item}`}><X size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="tag-input-row">
        <input id={fieldId(name)} value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={add} placeholder={placeholder} />
        <button type="button" className="button secondary compact" onClick={add} disabled={!draft.trim()}><Plus size={15} /> Agregar</button>
      </div>
      <FieldError name={name} errors={errors} />
    </div>
  );
}
