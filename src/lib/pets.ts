import { ApiError } from "@/lib/api";
import type {
  ApiProblem,
  Pet,
  PetPublicField,
  PetRequest,
  PetSex,
  PetSize,
  PetSpecies,
  PetVisibility,
} from "@/lib/types";

export const SPECIES_OPTIONS: Array<{ value: PetSpecies; label: string }> = [
  { value: "dog", label: "Perro" },
  { value: "cat", label: "Gato" },
  { value: "other", label: "Otra especie" },
];

export const SEX_OPTIONS: Array<{ value: PetSex; label: string }> = [
  { value: "female", label: "Hembra" },
  { value: "male", label: "Macho" },
  { value: "unknown", label: "Sin especificar" },
];

export const SIZE_OPTIONS: Array<{ value: PetSize; label: string }> = [
  { value: "", label: "Sin especificar" },
  { value: "small", label: "Pequeño" },
  { value: "medium", label: "Mediano" },
  { value: "large", label: "Grande" },
  { value: "giant", label: "Gigante" },
];

export const VISIBILITY_OPTIONS: Array<{ value: PetVisibility; label: string }> = [
  { value: "always", label: "Siempre" },
  { value: "lost_only", label: "Solo en modo perdido" },
  { value: "hidden", label: "Oculto" },
];

export type PublicFieldInfo = { field: PetPublicField; label: string; hint?: string };

// Order and grouping shown in the "Perfil público" section. Exact address,
// phone numbers, chip number and exact birth date are never public.
export const PUBLIC_FIELD_GROUPS: Array<{ title: string; fields: PublicFieldInfo[] }> = [
  {
    title: "Identificación",
    fields: [
      { field: "photo", label: "Foto" },
      { field: "species", label: "Especie" },
      { field: "breed", label: "Raza", hint: "Mostrarla siempre facilita el robo dirigido." },
      { field: "color", label: "Color" },
      { field: "sex", label: "Sexo" },
      { field: "age", label: "Edad aproximada" },
      { field: "size", label: "Tamaño" },
      { field: "distinctiveFeatures", label: "Rasgos característicos" },
    ],
  },
  {
    title: "Salud",
    fields: [
      { field: "allergies", label: "Alergias", hint: "Recomendado: ayuda a quien la encuentre a cuidarla." },
      { field: "specialConditions", label: "Condiciones especiales" },
      { field: "surgeries", label: "Cirugías" },
      { field: "temperament", label: "Temperamento" },
    ],
  },
  {
    title: "Contacto",
    fields: [
      { field: "contactButton", label: "Botón para contactarte", hint: "Llama o escribe sin mostrar tu número." },
      { field: "ownerName", label: "Tu nombre de pila" },
      { field: "comuna", label: "Comuna", hint: "Nunca se muestra el barrio ni la dirección." },
      { field: "secondOwner", label: "Segundo dueño" },
    ],
  },
];

export const DEFAULT_VISIBILITY: Record<PetPublicField, PetVisibility> = {
  photo: "always",
  species: "always",
  breed: "lost_only",
  color: "lost_only",
  sex: "lost_only",
  age: "hidden",
  size: "lost_only",
  distinctiveFeatures: "lost_only",
  allergies: "always",
  specialConditions: "always",
  surgeries: "hidden",
  temperament: "always",
  ownerName: "lost_only",
  contactButton: "always",
  comuna: "lost_only",
  secondOwner: "hidden",
};

export type PetForm = {
  version?: number;
  name: string;
  species: PetSpecies | "";
  breed: string;
  color: string;
  sex: PetSex;
  birthDate: string;
  chipNumber: string;
  weightKg: string;
  size: PetSize;
  distinctiveFeatures: string;
  allergies: string[];
  surgeries: string[];
  specialConditions: string[];
  temperament: string;
  ownerFullName: string;
  ownerAddress: string;
  ownerComuna: string;
  ownerPhone: string;
  ownerPhoneAlt: string;
  secondOwnerFullName: string;
  secondOwnerPhone: string;
  publicVisibility: Record<PetPublicField, PetVisibility>;
};

export function emptyPetForm(ownerName = ""): PetForm {
  return {
    name: "",
    species: "",
    breed: "",
    color: "",
    sex: "unknown",
    birthDate: "",
    chipNumber: "",
    weightKg: "",
    size: "",
    distinctiveFeatures: "",
    allergies: [],
    surgeries: [],
    specialConditions: [],
    temperament: "",
    ownerFullName: ownerName,
    ownerAddress: "",
    ownerComuna: "",
    ownerPhone: "",
    ownerPhoneAlt: "",
    secondOwnerFullName: "",
    secondOwnerPhone: "",
    publicVisibility: { ...DEFAULT_VISIBILITY },
  };
}

export function petToForm(pet: Pet): PetForm {
  return {
    version: pet.version,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    color: pet.color,
    sex: pet.sex,
    birthDate: pet.birthDate,
    chipNumber: pet.chipNumber,
    weightKg: pet.weightKg == null ? "" : String(pet.weightKg).replace(".", ","),
    size: pet.size,
    distinctiveFeatures: pet.distinctiveFeatures,
    allergies: [...pet.health.allergies],
    surgeries: [...pet.health.surgeries],
    specialConditions: [...pet.health.specialConditions],
    temperament: pet.health.temperament,
    ownerFullName: pet.owner.fullName,
    ownerAddress: pet.owner.address,
    ownerComuna: pet.owner.comuna,
    ownerPhone: pet.owner.phone,
    ownerPhoneAlt: pet.owner.phoneAlt,
    secondOwnerFullName: pet.secondOwner.fullName,
    secondOwnerPhone: pet.secondOwner.phone,
    publicVisibility: { ...DEFAULT_VISIBILITY, ...pet.publicVisibility },
  };
}

/** Parses "12,5" or "12.5"; returns NaN for anything that is not a number. */
export function parseWeight(raw: string): number | null {
  const value = raw.trim().replace(",", ".").replace(/\.$/, "");
  if (!value) return null;
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : Number.NaN;
}

/**
 * Keeps only what a weight in kilos can contain while typing: up to 3 integer
 * digits and 2 decimals, with a single comma or dot as separator ("12,5").
 */
export function sanitizeWeightInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const separatorAt = cleaned.search(/[.,]/);
  if (separatorAt === -1) return cleaned.slice(0, 3);
  const integer = cleaned.slice(0, separatorAt).slice(0, 3) || "0";
  const decimals = cleaned.slice(separatorAt + 1).replace(/[.,]/g, "").slice(0, 2);
  return `${integer},${decimals}`;
}

/** Chip numbers are digits only (ISO 11784 chips have 15). */
export function sanitizeChipInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 15);
}

/** Today as YYYY-MM-DD in the browser's time zone (toISOString would use UTC). */
export function localDateISO(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formToRequest(form: PetForm): PetRequest {
  const weight = parseWeight(form.weightKg);
  const secondOwner = { fullName: form.secondOwnerFullName.trim(), phone: form.secondOwnerPhone.trim() };
  const request: PetRequest = {
    name: form.name.trim(),
    species: form.species as PetSpecies,
    breed: form.breed.trim(),
    color: form.color.trim(),
    sex: form.sex,
    birthDate: form.birthDate,
    chipNumber: form.chipNumber.replace(/[\s.-]/g, ""),
    weightKg: weight,
    size: form.size,
    distinctiveFeatures: form.distinctiveFeatures.trim(),
    health: {
      allergies: cleanItems(form.allergies),
      surgeries: cleanItems(form.surgeries),
      specialConditions: cleanItems(form.specialConditions),
      temperament: form.temperament.trim(),
    },
    owner: {
      fullName: form.ownerFullName.trim(),
      address: form.ownerAddress.trim(),
      comuna: form.ownerComuna.trim(),
      phone: form.ownerPhone.trim(),
      phoneAlt: form.ownerPhoneAlt.trim(),
    },
    publicVisibility: { ...form.publicVisibility },
  };
  if (secondOwner.fullName || secondOwner.phone) request.secondOwner = secondOwner;
  if (form.version) request.version = form.version;
  return request;
}

export const PET_FORM_STEPS = [
  { id: "identity", title: "Identificación", hint: "Nombre, especie y chip" },
  { id: "health", title: "Salud", hint: "Alergias y condiciones" },
  { id: "owners", title: "Dueños", hint: "Cómo contactarte" },
  { id: "visibility", title: "Perfil público", hint: "Qué ve quien la encuentre" },
] as const;

/** API/validation field name for each form value, used to clear an error when the value changes. */
export const FORM_ERROR_FIELDS: Partial<Record<keyof PetForm, string>> = {
  name: "name",
  species: "species",
  breed: "breed",
  color: "color",
  sex: "sex",
  birthDate: "birthDate",
  chipNumber: "chipNumber",
  weightKg: "weightKg",
  size: "size",
  distinctiveFeatures: "distinctiveFeatures",
  allergies: "health.allergies",
  surgeries: "health.surgeries",
  specialConditions: "health.specialConditions",
  temperament: "health.temperament",
  ownerFullName: "owner.fullName",
  ownerAddress: "owner.address",
  ownerComuna: "owner.comuna",
  ownerPhone: "owner.phone",
  ownerPhoneAlt: "owner.phoneAlt",
  secondOwnerFullName: "secondOwner.fullName",
  secondOwnerPhone: "secondOwner.phone",
};

/** Index of the form step that holds an API or client field (e.g. "owner.phone" → 2). */
export function stepOfField(field: string): number {
  if (field.startsWith("health.")) return 1;
  if (field.startsWith("owner.") || field.startsWith("secondOwner.")) return 2;
  if (field.startsWith("publicVisibility.")) return 3;
  return 0;
}

export function errorsForStep(errors: Record<string, string>, step: number): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).filter(([field]) => stepOfField(field) === step));
}

export function withoutStep(errors: Record<string, string>, step: number): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).filter(([field]) => stepOfField(field) !== step));
}

/** Client-side checks for the fields the browser cannot express; the API validates everything again. */
export function validatePetForm(form: PetForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Escribe el nombre de tu mascota.";
  if (!form.species) errors.species = "Elige la especie.";
  if (!form.ownerFullName.trim()) errors["owner.fullName"] = "Indica el nombre del dueño registrado en el chip.";
  if (!form.ownerPhone.trim()) errors["owner.phone"] = "Necesitamos un teléfono de contacto.";
  const weight = parseWeight(form.weightKg);
  if (weight !== null && (Number.isNaN(weight) || weight <= 0 || weight > 150)) {
    errors.weightKg = "Usa un peso en kilos entre 0,1 y 150.";
  }
  if (form.secondOwnerPhone.trim() && !form.secondOwnerFullName.trim()) {
    errors["secondOwner.fullName"] = "Agrega el nombre del segundo dueño.";
  }
  return errors;
}

const FIELD_CODE_MESSAGES: Record<string, string> = {
  required: "Este dato es obligatorio.",
  max: "Es demasiado largo.",
  oneof: "Elige una opción válida.",
  invalid: "Contiene caracteres no permitidos.",
  phone: "Usa un teléfono válido, por ejemplo +56 9 1234 5678.",
  digits: "El número de chip solo lleva dígitos.",
  length: "El número de chip tiene entre 9 y 15 dígitos (normalmente 15).",
  range: "Usa un peso en kilos entre 0,1 y 150.",
  future: "La fecha de nacimiento no puede ser futura.",
  too_old: "Revisa la fecha de nacimiento.",
  date: "Usa una fecha válida.",
  max_items: "Puedes registrar hasta 20 elementos.",
  item: "Cada elemento puede tener hasta 120 caracteres.",
  unknown: "Campo no permitido.",
};

/** Maps API problem field errors (e.g. owner.phone:phone) to Spanish messages keyed by field. */
export function fieldErrorsFromProblem(problem?: ApiProblem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const error of problem?.errors || []) {
    out[error.field] = FIELD_CODE_MESSAGES[error.code] || "Revisa este dato.";
  }
  return out;
}

export function speciesLabel(species: string): string {
  return SPECIES_OPTIONS.find((option) => option.value === species)?.label || "Mascota";
}

export function sexLabel(sex: string): string {
  return SEX_OPTIONS.find((option) => option.value === sex)?.label || "Sin especificar";
}

export function sizeLabel(size: string): string {
  return SIZE_OPTIONS.find((option) => option.value === size)?.label || "Sin especificar";
}

export function visibilityLabel(visibility: PetVisibility): string {
  return VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.label || "Oculto";
}

/** Human age from a YYYY-MM-DD birth date ("3 años", "8 meses", "Menos de 1 mes"). */
export function petAge(birthDate: string, now: Date = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || "");
  if (!match) return "";
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  if (now.getDate() < day) months -= 1;
  if (months < 0) return "";
  return formatMonths(months);
}

/** Human age from a count of months ("Menos de 1 mes", "1 mes", "8 meses", "5 años"). */
export function formatMonths(months: number): string {
  if (months < 1) return "Menos de 1 mes";
  if (months < 12) return months === 1 ? "1 mes" : `${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 año" : `${years} años`;
}

export function petPhotoSrc(photoUrl?: string): string | undefined {
  return photoUrl ? `/api/backend${photoUrl}` : undefined;
}

function cleanItems(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const value = item.replace(/\s+/g, " ").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export const MAX_PHOTO_BYTES = 1024 * 1024;
const MAX_PHOTO_SIDE = 1280;

/** Scales the image down to 1280 px and re-encodes it as JPEG under 1 MB. */
export async function preparePetPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elige una imagen (JPEG o PNG).");
  }
  let bitmap: ImageBitmap;
  try {
    // Apply the camera's EXIF rotation so phone photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      // Browsers that reject the option already apply the EXIF rotation by default.
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error("No pudimos leer esa imagen. Prueba con una foto JPEG o PNG.");
    }
  }
  const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tu navegador no pudo procesar la imagen.");
  // JPEG has no transparency: paint a white background so transparent PNGs do not turn black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.86, 0.75, 0.62, 0.5]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new Error("La imagen sigue siendo muy pesada. Prueba con otra foto.");
}

/** Uploads raw image bytes; the API detects the type from the content. */
export async function uploadPetPhoto(petId: string, photo: Blob): Promise<Pet> {
  const response = await fetch(`/api/backend/v1/pets/${petId}/photo`, {
    method: "PUT",
    headers: { "Content-Type": photo.type || "image/jpeg" },
    body: photo,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = (body ?? {}) as ApiProblem;
    throw new ApiError(problem.detail || problem.title || "No pudimos subir la foto.", response.status, problem);
  }
  return (body as { data: Pet }).data;
}
