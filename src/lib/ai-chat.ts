import type { User } from "@/lib/types";

export const CHAT_MAX_BODY_BYTES = 32_768;

export function mastraChatHeaders(input: {
  serviceToken: string;
  actorContext: string;
  accessToken: string;
  requestId: string;
}): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "X-Base-Stream": "v1",
    "X-Request-Id": input.requestId,
    Authorization: `Bearer ${input.serviceToken}`,
    "X-Actor-Context": input.actorContext,
    "X-Actor-Authorization": `Bearer ${input.accessToken}`,
  });
  return headers;
}

export function sessionUserFromEnvelope(payload: unknown): Pick<User, "id" | "isAdmin" | "permissions"> | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as { data?: Partial<User> }).data;
  if (!data?.id) return null;
  return {
    id: data.id,
    isAdmin: Boolean(data.isAdmin),
    permissions: data.permissions ?? [],
  };
}
