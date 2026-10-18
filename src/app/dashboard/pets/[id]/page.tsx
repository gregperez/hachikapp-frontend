"use client";

import { PetAvatar } from "@/components/pet-avatar";
import { LoadingState, Modal, Notice, PageHeader } from "@/components/ui";
import { api, dataOf, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  PUBLIC_FIELD_GROUPS,
  petAge,
  preparePetPhoto,
  sexLabel,
  sizeLabel,
  speciesLabel,
  uploadPetPhoto,
  visibilityLabel,
} from "@/lib/pets";
import type { ApiEnvelope, Pet, PetVisibility } from "@/lib/types";
import { Camera, Cpu, Edit3, Eye, HeartPulse, IdCard, ImageOff, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, Suspense, useEffect, useRef, useState } from "react";

type NoticeState = { message: string; kind: "success" | "error" } | null;

const VISIBILITY_BADGE: Record<PetVisibility, string> = {
  always: "success",
  lost_only: "warning",
  hidden: "neutral",
};

function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<ApiEnvelope<Pet>>(`v1/pets/${id}`)
      .then((envelope) => setPet(dataOf(envelope)))
      .catch((caught) => setLoadError(errorMessage(caught)));
  }, [id]);

  useEffect(() => {
    const created = params.get("created");
    const saved = params.get("saved");
    if (!created && !saved) return;
    setNotice(created
      ? { message: "¡Listo! La ficha quedó creada. Agrega una foto para que la reconozcan fácilmente.", kind: "success" }
      : { message: "Los cambios quedaron guardados.", kind: "success" });
    // Drop the one-time flag so a reload does not show the notice again.
    router.replace(pathname);
  }, [params, pathname, router]);

  async function onPhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !pet) return;
    setUploading(true);
    setNotice(null);
    try {
      const photo = await preparePetPhoto(file);
      setPet(await uploadPetPhoto(pet.id, photo));
      setNotice({ message: "Foto actualizada.", kind: "success" });
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    if (!pet) return;
    setUploading(true);
    setNotice(null);
    try {
      setPet(dataOf(await api<ApiEnvelope<Pet>>(`v1/pets/${pet.id}/photo`, { method: "DELETE" })));
      setNotice({ message: "Quitamos la foto.", kind: "success" });
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function deletePet() {
    if (!pet) return;
    setDeleting(true);
    try {
      await api(`v1/pets/${pet.id}`, { method: "DELETE" });
      router.replace("/dashboard/pets");
    } catch (caught) {
      setConfirmDelete(false);
      setNotice({ message: errorMessage(caught), kind: "error" });
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <>
        <PageHeader eyebrow="MIS MASCOTAS" title="Ficha no disponible" description="No pudimos abrir esta ficha." />
        <Notice message={loadError} kind="error" />
        <Link href="/dashboard/pets" className="button secondary">Volver a mis mascotas</Link>
      </>
    );
  }
  if (!pet) return <LoadingState />;

  const age = petAge(pet.birthDate);
  const summary = [speciesLabel(pet.species), pet.breed, age].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        eyebrow="MIS MASCOTAS"
        title={pet.name}
        description="Su carnet digital, listo para mostrar en el control."
        actions={<>
          <button type="button" className="button secondary" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Eliminar</button>
          <Link href={`/dashboard/pets/${pet.id}/edit`} className="button primary"><Edit3 size={16} /> Editar ficha</Link>
        </>}
      />
      <Notice message={notice?.message} kind={notice?.kind} />

      <section className="panel pet-hero">
        <PetAvatar pet={pet} size="hero" />
        <div className="pet-hero-copy">
          <h2>{pet.name}</h2>
          <p>{summary}</p>
          <div className="pet-card-tags">
            {pet.chipNumber ? (
              <span className="status-badge success"><Cpu size={12} /> Chip {pet.chipNumber}</span>
            ) : (
              <span className="status-badge warning"><Cpu size={12} /> Sin chip registrado</span>
            )}
          </div>
        </div>
        <div className="pet-hero-actions">
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPhotoSelected} />
          <button type="button" className="button secondary" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <span className="spinner" /> : <Camera size={16} />} {pet.photoUrl ? "Cambiar foto" : "Agregar foto"}
          </button>
          {pet.photoUrl && (
            <button type="button" className="button ghost" onClick={removePhoto} disabled={uploading}><ImageOff size={16} /> Quitar</button>
          )}
        </div>
      </section>

      <div className="pet-detail-grid">
        <section className="panel">
          <div className="panel-heading icon-heading"><span className="metric-icon indigo"><IdCard size={20} /></span><div><h2>Identificación</h2><p>Datos de su carnet</p></div></div>
          <dl className="pet-facts">
            <Fact label="Especie" value={speciesLabel(pet.species)} />
            <Fact label="Raza" value={pet.breed} />
            <Fact label="Color" value={pet.color} />
            <Fact label="Sexo" value={sexLabel(pet.sex)} />
            <Fact label="Nacimiento" value={pet.birthDate ? `${formatDate(`${pet.birthDate}T12:00:00`)}${age ? ` (${age})` : ""}` : ""} />
            <Fact label="Microchip" value={pet.chipNumber} />
            <Fact label="Peso inicial" value={pet.weightKg != null ? `${pet.weightKg.toLocaleString("es-CL")} kg` : ""} />
            <Fact label="Tamaño" value={pet.size ? sizeLabel(pet.size) : ""} />
            <Fact label="Rasgos característicos" value={pet.distinctiveFeatures} wide />
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading icon-heading"><span className="metric-icon amber"><HeartPulse size={20} /></span><div><h2>Salud</h2><p>Condiciones a tener presentes</p></div></div>
          <dl className="pet-facts single">
            <TagFact label="Alergias" items={pet.health.allergies} />
            <TagFact label="Condiciones especiales" items={pet.health.specialConditions} />
            <TagFact label="Cirugías" items={pet.health.surgeries} />
            <Fact label="Temperamento" value={pet.health.temperament} wide />
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading icon-heading"><span className="metric-icon green"><UserRound size={20} /></span><div><h2>Contacto</h2><p>Dueños de la mascota</p></div></div>
          <dl className="pet-facts single">
            <Fact label="Dueño registrado en el chip" value={pet.owner.fullName} />
            <Fact label="Teléfonos" value={[pet.owner.phone, pet.owner.phoneAlt].filter(Boolean).join(" · ")} />
            <Fact label="Comuna" value={pet.owner.comuna} />
            <Fact label="Dirección" value={pet.owner.address} />
            <Fact label="Segundo dueño" value={[pet.secondOwner.fullName, pet.secondOwner.phone].filter(Boolean).join(" · ")} />
          </dl>
        </section>

        <section className="panel">
          <div className="panel-heading icon-heading"><span className="metric-icon blue"><Eye size={20} /></span><div><h2>Perfil público</h2><p>Tú decides qué ve quien escanee su Hachikapp Tag</p></div></div>
          <div className="visibility-summary">
            {PUBLIC_FIELD_GROUPS.map((group) => (
              <div key={group.title}>
                <h3>{group.title}</h3>
                <ul>
                  {group.fields.map((info) => {
                    const visibility = pet.publicVisibility[info.field] || "hidden";
                    return (
                      <li key={info.field}>
                        <span>{info.label}</span>
                        <span className={`status-badge ${VISIBILITY_BADGE[visibility]}`}><i />{visibilityLabel(visibility)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Modal open={confirmDelete} title={`¿Eliminar la ficha de ${pet.name}?`} description="Se borrarán sus datos y su foto. Esta acción no se puede deshacer." onClose={() => setConfirmDelete(false)}>
        <div className="modal-form">
          <div className="modal-actions">
            <button type="button" className="button secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button type="button" className="button danger" onClick={deletePet} disabled={deleting}><Trash2 size={16} /> {deleting ? "Eliminando…" : "Eliminar ficha"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Fact({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "wide" : undefined}>
      <dt>{label}</dt>
      <dd className={value ? undefined : "empty"}>{value || "Sin registrar"}</dd>
    </div>
  );
}

function TagFact({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="wide">
      <dt>{label}</dt>
      <dd className={items.length ? undefined : "empty"}>
        {items.length ? <ul className="tag-list">{items.map((item) => <li key={item} className="tag">{item}</li>)}</ul> : "Sin registros"}
      </dd>
    </div>
  );
}

export default function PetDetailPage() {
  return <Suspense fallback={<LoadingState />}><PetDetail /></Suspense>;
}
