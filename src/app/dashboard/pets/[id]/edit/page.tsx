"use client";

import { PetForm } from "@/components/pet-form";
import { LoadingState, Notice, PageHeader } from "@/components/ui";
import { ApiError, api, dataOf, errorMessage } from "@/lib/api";
import { fieldErrorsFromProblem, formToRequest, petToForm } from "@/lib/pets";
import type { ApiEnvelope, Pet } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditPetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ApiEnvelope<Pet>>(`v1/pets/${id}`)
      .then((envelope) => setPet(dataOf(envelope)))
      .catch((caught) => setError(errorMessage(caught)));
  }, [id]);

  return (
    <>
      <PageHeader eyebrow="MIS MASCOTAS" title={pet ? `Editar a ${pet.name}` : "Editar ficha"} description="Los cambios se guardan en su carnet digital." />
      <Notice message={error} kind="error" />
      {!pet && !error && <LoadingState />}
      {pet && (
        <PetForm
          key={`${pet.id}-${pet.version}`}
          initial={petToForm(pet)}
          submitLabel="Guardar cambios"
          cancelHref={`/dashboard/pets/${pet.id}`}
          onSubmit={async (values) => {
            try {
              await api<ApiEnvelope<Pet>>(`v1/pets/${pet.id}`, { method: "PUT", body: JSON.stringify(formToRequest(values)) });
              router.push(`/dashboard/pets/${pet.id}?saved=1`);
            } catch (caught) {
              return {
                fieldErrors: caught instanceof ApiError ? fieldErrorsFromProblem(caught.problem) : undefined,
                message: errorMessage(caught),
              };
            }
          }}
        />
      )}
    </>
  );
}
