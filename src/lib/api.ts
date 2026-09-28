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
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
