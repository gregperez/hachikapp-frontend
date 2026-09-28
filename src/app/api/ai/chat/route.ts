import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("base_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ detail: "Debes iniciar sesión para usar el asistente." }, { status: 401 });
  }

  try {
    const backendUrl = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/$/, "");
    const session = await fetch(`${backendUrl}/v1/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!session.ok) {
      return NextResponse.json({ detail: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ detail: "No fue posible validar la sesión con el backend." }, { status: 502 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
  const messages = body?.messages?.slice(-30).filter((message) =>
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= 2000
  );
  if (!messages?.length) {
    return NextResponse.json({ detail: "El mensaje no es válido." }, { status: 422 });
  }

  const endpoint = process.env.AI_CHAT_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json({
      configured: false,
      message: "La interfaz de chat ya está lista. El siguiente paso es conectar un agente Mastra u otro servicio mediante AI_CHAT_ENDPOINT.",
    });
  }

  try {
    const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json" });
    if (process.env.AI_CHAT_API_KEY) headers.set("Authorization", `Bearer ${process.env.AI_CHAT_API_KEY}`);
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages }),
      cache: "no-store",
    });
    const payload = (await upstream.json().catch(() => null)) as { message?: string; text?: string; detail?: string } | null;
    if (!upstream.ok) {
      return NextResponse.json({ detail: payload?.detail || "El servicio de IA rechazó la solicitud." }, { status: upstream.status });
    }
    return NextResponse.json({ configured: true, message: payload?.message || payload?.text || "El asistente no devolvió contenido." });
  } catch {
    return NextResponse.json({ detail: "No fue posible conectar con el servicio de IA configurado." }, { status: 502 });
  }
}
