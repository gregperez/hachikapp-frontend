"use client";

import { PetForm } from "@/components/pet-form";
import { PageHeader } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { ApiError, api, dataOf, errorMessage } from "@/lib/api";
import { emptyPetForm, fieldErrorsFromProblem, formToRequest } from "@/lib/pets";
import type { ApiEnvelope, Pet } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function NewPetPage() {
  const router = useRouter();
  const { user } = useSession();

  return (
    <>
      <PageHeader eyebrow="MIS MASCOTAS" title="Nueva ficha" description="Empieza con lo básico; puedes completar el resto después." />
      <PetForm
        key={user?.id || "anonymous"}
        initial={emptyPetForm(user?.name || "")}
        submitLabel="Crear ficha"
        cancelHref="/dashboard/pets"
        onSubmit={async (values) => {
          try {
            const pet = dataOf(await api<ApiEnvelope<Pet>>("v1/pets", { method: "POST", body: JSON.stringify(formToRequest(values)) }));
            router.push(`/dashboard/pets/${pet.id}?created=1`);
          } catch (caught) {
            return {
              fieldErrors: caught instanceof ApiError ? fieldErrorsFromProblem(caught.problem) : undefined,
              message: errorMessage(caught),
            };
          }
        }}
      />
    </>
  );
}
