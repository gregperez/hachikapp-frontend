"use client";

import { LoadingState, Notice, PageHeader } from "@/components/ui";
import { PetAvatar } from "@/components/pet-avatar";
import { api, dataOf, errorMessage } from "@/lib/api";
import { petAge, speciesLabel } from "@/lib/pets";
import type { ApiEnvelope, Pet } from "@/lib/types";
import { AlertTriangle, ArrowRight, Cpu, PawPrint, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPets(dataOf(await api<ApiEnvelope<Pet[]>>("v1/pets")));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="MI FAMILIA"
        title="Mis mascotas"
        description="El carnet de tu mascota, siempre contigo."
        actions={pets.length > 0 ? <Link href="/dashboard/pets/new" className="button primary"><Plus size={17} /> Nueva mascota</Link> : undefined}
      />
      <Notice message={error} kind="error" />

      {loading ? (
        <LoadingState />
      ) : pets.length === 0 && !error ? (
        <section className="panel empty-state pet-empty">
          <span className="pet-empty-icon"><PawPrint size={30} /></span>
          <h3>Crea la ficha de tu mascota</h3>
          <p>Guarda su identificación, su salud y cómo contactarte, todo en un solo lugar.</p>
          <Link href="/dashboard/pets/new" className="button primary"><Plus size={17} /> Crear ficha</Link>
        </section>
      ) : (
        <ul className="pet-grid">
          {pets.map((pet) => {
            const alerts = pet.health.allergies.length + pet.health.specialConditions.length;
            const age = petAge(pet.birthDate);
            return (
              <li key={pet.id}>
                <Link href={`/dashboard/pets/${pet.id}`} className="pet-card">
                  <PetAvatar pet={pet} size="large" />
                  <div className="pet-card-body">
                    <h2>{pet.name}</h2>
                    <p>{[speciesLabel(pet.species), pet.breed, age].filter(Boolean).join(" · ")}</p>
                    <div className="pet-card-tags">
                      {pet.chipNumber ? (
                        <span className="status-badge success"><Cpu size={12} /> Chip registrado</span>
                      ) : (
                        <span className="status-badge warning"><Cpu size={12} /> Sin chip registrado</span>
                      )}
                      {alerts > 0 && <span className="status-badge neutral"><AlertTriangle size={12} /> {alerts === 1 ? "1 alerta de salud" : `${alerts} alertas de salud`}</span>}
                    </div>
                  </div>
                  <ArrowRight size={18} className="pet-card-arrow" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
