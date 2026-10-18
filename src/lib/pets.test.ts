import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VISIBILITY,
  PUBLIC_FIELD_GROUPS,
  emptyPetForm,
  fieldErrorsFromProblem,
  formToRequest,
  parseWeight,
  sanitizeWeightInput,
  petAge,
  petPhotoSrc,
  petToForm,
  localDateISO,
  preparePetPhoto,
  errorsForStep,
  stepOfField,
  withoutStep,
  validatePetForm,
} from "@/lib/pets";
import type { Pet } from "@/lib/types";

const pet: Pet = {
  id: "2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11",
  name: "Luna",
  species: "dog",
  breed: "Mestiza",
  color: "Café",
  sex: "female",
  birthDate: "2021-03-14",
  chipNumber: "900123456789012",
  weightKg: 12.5,
  size: "medium",
  distinctiveFeatures: "Mancha blanca",
  health: { allergies: ["Atún"], surgeries: [], specialConditions: ["Sorda"], temperament: "Tímida" },
  owner: { fullName: "Wilson", address: "Calle 1", comuna: "Ñuñoa", phone: "+56 9 1234 5678", phoneAlt: "" },
  secondOwner: { fullName: "", phone: "" },
  publicVisibility: { ...DEFAULT_VISIBILITY, breed: "always" },
  photoUrl: "/v1/pets/2f1c5a0e-6a43-4f8e-9a51-0c2f3f9b7d11/photo?v=1",
  version: 3,
  createdAt: "2026-10-18T21:00:00Z",
  updatedAt: "2026-10-18T21:00:00Z",
};

describe("pet form mapping", () => {
  it("round-trips a pet through the form without losing data", () => {
    const request = formToRequest(petToForm(pet));
    expect(request.version).toBe(3);
    expect(request.weightKg).toBe(12.5);
    expect(request.health.allergies).toEqual(["Atún"]);
    expect(request.publicVisibility.breed).toBe("always");
    expect(request.secondOwner).toBeUndefined();
  });

  it("cleans text, chip separators, lists and the decimal comma", () => {
    const form = {
      ...emptyPetForm("Wilson"),
      name: "  Luna ",
      species: "cat" as const,
      chipNumber: "900 123-456.789012",
      weightKg: "4,25",
      allergies: [" pollo ", "Pollo", ""],
      ownerPhone: " +56 9 1234 5678 ",
      secondOwnerFullName: "Andrea",
    };
    const request = formToRequest(form);
    expect(request.name).toBe("Luna");
    expect(request.chipNumber).toBe("900123456789012");
    expect(request.weightKg).toBe(4.25);
    expect(request.health.allergies).toEqual(["pollo"]);
    expect(request.owner.phone).toBe("+56 9 1234 5678");
    expect(request.secondOwner).toEqual({ fullName: "Andrea", phone: "" });
    expect(request.version).toBeUndefined();
  });

  it("starts new forms with the brand-manual visibility defaults", () => {
    const form = emptyPetForm();
    expect(form.publicVisibility.contactButton).toBe("always");
    expect(form.publicVisibility.comuna).toBe("lost_only");
    expect(form.publicVisibility).not.toBe(DEFAULT_VISIBILITY);
  });

  it("offers every visibility field exactly once and never private data", () => {
    const fields = PUBLIC_FIELD_GROUPS.flatMap((group) => group.fields.map((info) => info.field));
    expect(new Set(fields).size).toBe(fields.length);
    expect([...fields].sort()).toEqual(Object.keys(DEFAULT_VISIBILITY).sort());
    for (const secret of ["address", "chipNumber", "phone", "birthDate"]) {
      expect(fields).not.toContain(secret);
    }
  });
});

describe("validatePetForm", () => {
  it("flags the required fields and inconsistent second owner", () => {
    const errors = validatePetForm({ ...emptyPetForm(), weightKg: "abc", secondOwnerPhone: "+56 9 8765 4321" });
    expect(Object.keys(errors).sort()).toEqual(["name", "owner.fullName", "owner.phone", "secondOwner.fullName", "species", "weightKg"]);
  });

  it("accepts a complete minimal form", () => {
    expect(validatePetForm({ ...emptyPetForm("Wilson"), name: "Luna", species: "dog", ownerPhone: "+56912345678" })).toEqual({});
  });
});

describe("helpers", () => {
  it("parses weights", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("12,5")).toBe(12.5);
    expect(parseWeight("12,")).toBe(12);
    expect(Number.isNaN(parseWeight("12kg") as number)).toBe(true);
  });

  it("computes a human age", () => {
    const now = new Date(2026, 9, 18);
    expect(petAge("2021-03-14", now)).toBe("5 años");
    expect(petAge("2025-10-18", now)).toBe("1 año");
    expect(petAge("2026-02-20", now)).toBe("7 meses");
    expect(petAge("2026-10-10", now)).toBe("Menos de 1 mes");
    expect(petAge("2027-01-01", now)).toBe("");
    expect(petAge("", now)).toBe("");
  });

  it("maps API field errors to Spanish messages", () => {
    const errors = fieldErrorsFromProblem({ errors: [{ field: "owner.phone", code: "phone" }, { field: "chipNumber", code: "weird" }] });
    expect(errors["owner.phone"]).toMatch(/teléfono válido/);
    expect(errors.chipNumber).toBe("Revisa este dato.");
  });

  it("routes photos through the authenticated proxy", () => {
    expect(petPhotoSrc(pet.photoUrl)).toBe(`/api/backend${pet.photoUrl}`);
    expect(petPhotoSrc(undefined)).toBeUndefined();
  });
});

describe("form steps", () => {
  it("routes every field to its section", () => {
    expect(stepOfField("name")).toBe(0);
    expect(stepOfField("chipNumber")).toBe(0);
    expect(stepOfField("health.allergies")).toBe(1);
    expect(stepOfField("owner.phone")).toBe(2);
    expect(stepOfField("secondOwner.fullName")).toBe(2);
    expect(stepOfField("publicVisibility.breed")).toBe(3);
  });

  it("splits errors by step", () => {
    const errors = { name: "a", "owner.phone": "b", "health.allergies": "c" };
    expect(Object.keys(errorsForStep(errors, 2))).toEqual(["owner.phone"]);
    expect(Object.keys(withoutStep(errors, 0)).sort()).toEqual(["health.allergies", "owner.phone"]);
  });
});

describe("sanitizeWeightInput", () => {
  it("drops anything that is not a number", () => {
    expect(sanitizeWeightInput("12kg")).toBe("12");
    expect(sanitizeWeightInput("abc")).toBe("");
    expect(sanitizeWeightInput("-5")).toBe("5");
  });

  it("keeps one decimal separator as a comma with up to two decimals", () => {
    expect(sanitizeWeightInput("12.5")).toBe("12,5");
    expect(sanitizeWeightInput("12,567")).toBe("12,56");
    expect(sanitizeWeightInput("1,2,3")).toBe("1,23");
    expect(sanitizeWeightInput(",5")).toBe("0,5");
    expect(sanitizeWeightInput("12,")).toBe("12,");
  });

  it("limits the integer part to three digits", () => {
    expect(sanitizeWeightInput("12345")).toBe("123");
  });
});

describe("localDateISO", () => {
  it("uses the local calendar day, not UTC", () => {
    // 21:30 in Santiago (UTC-3) is already the next day in UTC.
    const lateEvening = new Date(2026, 9, 18, 21, 30);
    expect(localDateISO(lateEvening)).toBe("2026-10-18");
  });
});

describe("preparePetPhoto", () => {
  const original = globalThis.createImageBitmap;
  afterEach(() => {
    globalThis.createImageBitmap = original;
  });

  it("explains in Spanish when the browser cannot read the image", async () => {
    globalThis.createImageBitmap = vi.fn(async () => {
      throw new Error("The source image could not be decoded.");
    }) as unknown as typeof createImageBitmap;
    const file = new File([new Uint8Array([1, 2, 3])], "IMG_0001.HEIC", { type: "image/heic" });
    await expect(preparePetPhoto(file)).rejects.toThrow("No pudimos leer esa imagen. Prueba con una foto JPEG o PNG.");
  });

  it("retries without options on browsers that reject imageOrientation", async () => {
    const spy = vi.fn(async (_file: unknown, options?: unknown) => {
      if (options) throw new TypeError("The provided value 'from-image' is not a valid enum value");
      return { width: 10, height: 10, close: () => undefined };
    });
    globalThis.createImageBitmap = spy as unknown as typeof createImageBitmap;
    const file = new File([new Uint8Array([1])], "foto.jpg", { type: "image/jpeg" });
    const error = await preparePetPhoto(file).catch((caught: Error) => caught);
    expect(spy).toHaveBeenCalledTimes(2);
    expect((error as Error).message).not.toBe("No pudimos leer esa imagen. Prueba con una foto JPEG o PNG.");
  });

  it("asks the browser to apply the photo's own orientation", async () => {
    const spy = vi.fn(async () => {
      throw new Error("stop after the call");
    });
    globalThis.createImageBitmap = spy as unknown as typeof createImageBitmap;
    const file = new File([new Uint8Array([1])], "foto.jpg", { type: "image/jpeg" });
    await preparePetPhoto(file).catch(() => undefined);
    expect(spy).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
  });
});
