import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PetForm } from "@/components/pet-form";
import { emptyPetForm, type PetForm as PetFormValues } from "@/lib/pets";

type SubmitResult = { fieldErrors?: Record<string, string>; message?: string } | void;

function renderForm(options: {
  mode?: "create" | "edit";
  initial?: PetFormValues;
  onSubmit?: (values: PetFormValues) => Promise<SubmitResult>;
} = {}) {
  const onSubmit = vi.fn(options.onSubmit ?? (async () => undefined));
  const user = userEvent.setup();
  render(
    <PetForm
      mode={options.mode ?? "create"}
      initial={options.initial ?? emptyPetForm("Wilson Sayago")}
      submitLabel={options.mode === "edit" ? "Guardar cambios" : "Crear ficha"}
      cancelHref="/dashboard/pets"
      onSubmit={onSubmit}
    />,
  );
  return { onSubmit, user };
}

const completeForm: PetFormValues = {
  ...emptyPetForm("Wilson Sayago"),
  name: "Luna",
  species: "dog",
  ownerPhone: "+56 9 1234 5678",
};

async function fillStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nombre \*/), "Luna");
  await user.selectOptions(screen.getByLabelText(/^Especie \*/), "dog");
}

describe("PetForm wizard", () => {
  it("blocks moving past Identificación until the required fields are set", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByText("Escribe el nombre de tu mascota.")).toBeInTheDocument();
  });

  it("clears a field error as soon as the field is edited", async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    await user.type(screen.getByLabelText(/^Nombre \*/), "L");
    expect(screen.queryByText("Escribe el nombre de tu mascota.")).not.toBeInTheDocument();
  });

  it("advances a single step on a double click", async () => {
    const { user } = renderForm();
    await fillStepOne(user);
    await user.dblClick(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Paso 2 de 4")).toBeInTheDocument();
  });

  it("never submits from a step before Perfil público, even on a fast double click", async () => {
    const { onSubmit, user } = renderForm({ initial: completeForm });
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Paso 3 de 4")).toBeInTheDocument();
    await user.dblClick(screen.getByRole("button", { name: /Siguiente/ }));
    expect(screen.getByText("Paso 4 de 4")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("announces the current step to assistive technology", () => {
    renderForm();
    expect(screen.getByText("Paso 1 de 4")).toHaveAttribute("aria-live", "polite");
  });

  it("keeps the submit button disabled after a successful save", async () => {
    const { onSubmit, user } = renderForm({ initial: completeForm });
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    const create = screen.getByRole("button", { name: /Crear ficha/ });
    await user.click(create);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: /Guardando/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled();
  });

  it("re-enables the submit button when the server rejects the data", async () => {
    const { user } = renderForm({
      initial: completeForm,
      onSubmit: async () => ({ message: "Revisa los datos marcados." }),
    });
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    await user.click(screen.getByRole("button", { name: /Crear ficha/ }));
    expect(await screen.findByRole("button", { name: /Crear ficha/ })).not.toBeDisabled();
  });

  it("opens the earliest step that has a server error", async () => {
    const { user } = renderForm({
      initial: completeForm,
      onSubmit: async () => ({
        fieldErrors: { "health.allergies": "Cada elemento puede tener hasta 120 caracteres.", weightKg: "Usa un peso en kilos entre 0,1 y 150." },
        message: "Revisa los datos marcados.",
      }),
    });
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    await user.click(screen.getByRole("button", { name: /Crear ficha/ }));
    expect(await screen.findByText("Paso 1 de 4")).toBeInTheDocument();
    expect(screen.getByText("Usa un peso en kilos entre 0,1 y 150.")).toBeInTheDocument();
  });

  it("shows server errors for sex and size", async () => {
    const { user } = renderForm({
      mode: "edit",
      initial: { ...completeForm, version: 2 },
      onSubmit: async () => ({ fieldErrors: { sex: "Elige una opción válida.", size: "Elige una opción válida." } }),
    });
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));
    expect(await screen.findAllByText("Elige una opción válida.")).toHaveLength(2);
  });

  it("keeps the full chip number when it is pasted in groups", async () => {
    const { user } = renderForm();
    const chip = screen.getByLabelText(/Número de microchip/);
    await user.click(chip);
    await user.paste("900 123 456 789 012");
    expect(chip).toHaveValue("900123456789012");
  });

  it("moves to the next step when Enter is pressed in a field", async () => {
    const { onSubmit, user } = renderForm();
    await fillStepOne(user);
    await user.type(screen.getByLabelText(/^Nombre \*/), "{Enter}");
    expect(screen.getByText("Paso 2 de 4")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("moves keyboard focus to the new step heading", async () => {
    const { user } = renderForm();
    await fillStepOne(user);
    await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Salud" }));
  });

  it("ignores the second click of a double click that lands on Crear ficha", async () => {
    const { onSubmit, user } = renderForm({ initial: completeForm });
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole("button", { name: /Crear ficha/ }), { detail: 2 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a visibility error when that row changes", async () => {
    const { user } = renderForm({
      mode: "edit",
      initial: { ...completeForm, version: 2 },
      onSubmit: async () => ({ fieldErrors: { "publicVisibility.breed": "Elige una opción válida." } }),
    });
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));
    expect(await screen.findByText("Elige una opción válida.")).toBeInTheDocument();
    const breedRow = screen.getByRole("radiogroup", { name: "Raza" });
    await user.click(breedRow.querySelector("input[value='always']") as HTMLInputElement);
    expect(screen.queryByText("Elige una opción válida.")).not.toBeInTheDocument();
  });

  it("accepts only digits in the chip number", async () => {
    const { user } = renderForm();
    const chip = screen.getByLabelText(/Número de microchip/);
    await user.type(chip, "90a0 12-3");
    expect(chip).toHaveValue("900123");
  });
});

describe("PetForm in edit mode", () => {
  it("saves from the first tab without walking the steps", async () => {
    const { onSubmit, user } = renderForm({ mode: "edit", initial: { ...completeForm, version: 2 } });
    await user.click(screen.getByRole("button", { name: /Guardar cambios/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
