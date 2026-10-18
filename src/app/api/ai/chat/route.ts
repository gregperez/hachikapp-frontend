import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { newActorContext, signActorContext } from "@/lib/actor-context";
import { CHAT_MAX_BODY_BYTES, mastraChatHeaders, sessionUserFromEnvelope } from "@/lib/ai-chat";

type ChatMessage = { role: "user" | "assistant"; content: string };

const unconfigured = {
  configured: false,
  message: "La interfaz de chat ya está lista. El siguiente paso es conectar un agente Mastra u otro servicio mediante AI_CHAT_ENDPOINT.",
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("base_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ detail: "Debes iniciar sesión para usar el asistente." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > CHAT_MAX_BODY_BYTES) {
    return NextResponse.json({ detail: "El mensaje supera el tamaño máximo." }, { status: 413 });
  }

  const requestId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const backendUrl = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");

  let sessionUser: ReturnType<typeof sessionUserFromEnvelope>;
  try {
    const session = await fetch(`${backendUrl}/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", "X-Request-Id": requestId },
      cache: "no-store",
      signal: request.signal,
    });
    if (!session.ok) {
      return NextResponse.json({ detail: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });
    }
    sessionUser = sessionUserFromEnvelope(await session.json().catch(() => null));
    if (!sessionUser) {
      return NextResponse.json({ detail: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });
    }
  } catch {
    if (request.signal.aborted) {
      return NextResponse.json({ detail: "La solicitud se canceló." }, { status: 499 });
    }
    return NextResponse.json({ detail: "No fue posible validar la sesión con el backend." }, { status: 502 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: ChatMessage[]; conversationId?: string } | null;
  const messages = body?.messages?.slice(-30).filter((message) =>
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 2000
  );
  if (!messages?.length) {
    return NextResponse.json({ detail: "El mensaje no es válido." }, { status: 422 });
  }

  const endpoint = process.env.AI_CHAT_ENDPOINT?.trim();
  if (!endpoint) {
    return NextResponse.json(unconfigured);
  }
  const serviceToken = process.env.AI_CHAT_API_KEY?.trim();
  const actorSecret = process.env.ACTOR_CONTEXT_SECRET?.trim();
  if (!serviceToken || !actorSecret) {
    return NextResponse.json({
      configured: false,
      message: "El asistente está apuntado pero faltan AI_CHAT_API_KEY o ACTOR_CONTEXT_SECRET en el servidor.",
    }, { status: 503 });
  }

  const actorContext = signActorContext(newActorContext(sessionUser, requestId), actorSecret);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.slice(0, 80) : undefined;

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: mastraChatHeaders({
        serviceToken,
        actorContext,
        accessToken,
        requestId,
      }),
      body: JSON.stringify({ messages, conversationId }),
      cache: "no-store",
      signal: request.signal,
    });
    if (!upstream.ok) {
      const payload = (await upstream.json().catch(() => null)) as { detail?: string } | null;
      return NextResponse.json({
        detail: payload?.detail || "El servicio de IA rechazó la solicitud.",
        requestId,
      }, { status: upstream.status });
    }
    const contentType = upstream.headers.get("content-type") || "application/json";
    if (contentType.includes("text/event-stream") && upstream.body) {
      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Base-Stream": "v1",
          "X-Request-Id": requestId,
        },
      });
    }
    const payload = (await upstream.json().catch(() => null)) as { message?: string; text?: string } | null;
    return NextResponse.json({
      configured: true,
      message: payload?.message || payload?.text || "El asistente no devolvió contenido.",
      requestId,
    });
  } catch {
    if (request.signal.aborted) {
      return NextResponse.json({ detail: "La generación se canceló." }, { status: 499 });
    }
    return NextResponse.json({ detail: "No fue posible conectar con el servicio de IA configurado." }, { status: 502 });
  }
}
