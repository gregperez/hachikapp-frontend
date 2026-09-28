import type { ApiEnvelope, ApiProblem } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public problem?: ApiProblem,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const problem = (body ?? {}) as ApiProblem;
    throw new ApiError(
      problem.detail || problem.title || "No pudimos completar la solicitud.",
      response.status,
      problem,
    );
  }

  return body as T;
}

export function dataOf<T>(envelope: ApiEnvelope<T>): T {
  return envelope.data;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.problem?.code === "VALIDATION_ERROR" && /password/i.test(error.problem.detail || "")) {
      return "La contraseña no cumple la política vigente. Revisa los requisitos indicados.";
    }
    const translations: Record<string, string> = {
      "Invalid credentials": "Las credenciales no son válidas.",
      "You do not have permission to perform this action": "No tienes permiso para realizar esta acción.",
      "The resource already exists or conflicts with current state": "El recurso ya existe o entra en conflicto con el estado actual.",
      "The settings were updated by someone else": "La configuración fue actualizada por otra persona.",
    };
    if (translations[error.message]) return translations[error.message];
  }
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
