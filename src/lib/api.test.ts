import { describe, expect, it } from "vitest";
import { ApiError, dataOf, errorMessage } from "@/lib/api";

describe("errorMessage", () => {
  it("maps a password validation problem", () => {
    const error = new ApiError("password must be stronger", 400, {
      code: "VALIDATION_ERROR",
      detail: "password does not meet the required policy",
    });

    expect(errorMessage(error)).toBe(
      "La contraseña no cumple la política vigente. Revisa los requisitos indicados.",
    );
  });

  it("translates a known API message", () => {
    const error = new ApiError("Invalid credentials", 401);

    expect(errorMessage(error)).toBe("Las credenciales no son válidas.");
  });

  it("translates the pet chip and photo problems from the API", () => {
    expect(errorMessage(new ApiError("Another pet of this account already uses this chip number", 409)))
      .toBe("Ya registraste otra mascota con ese número de chip. Revisa los dígitos.");
    expect(errorMessage(new ApiError("The photo must be a JPEG or PNG image up to 1 MiB and 4096 px per side", 422)))
      .toBe("La foto debe ser JPEG o PNG, pesar menos de 1 MB y medir hasta 4096 px por lado.");
  });

  it("returns a generic Error message", () => {
    expect(errorMessage(new Error("Fallo de red"))).toBe("Fallo de red");
  });

  it("falls back for unknown values", () => {
    expect(errorMessage({ unexpected: true })).toBe("Ocurrió un error inesperado.");
  });
});

describe("dataOf", () => {
  it("unwraps envelope data", () => {
    expect(dataOf({ status: 200, message: "ok", data: { id: "user-1" } })).toEqual({
      id: "user-1",
    });
  });
});
