export type ChatSsePayload = {
  text?: string;
  message?: string;
  detail?: string;
  requestId?: string;
};

export function parseSseBlock(block: string): { event: string; data: ChatSsePayload } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) event = line.slice("event:".length).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join("\n")) as ChatSsePayload };
  } catch {
    return { event, data: { text: dataLines.join("\n") } };
  }
}

export async function consumeSse(
  response: Response,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ message: string }> {
  if (!response.body) throw new Error("El asistente no devolvió contenido.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("La generación se canceló.", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";
      for (const part of parts) {
        const parsed = parseSseBlock(part);
        if (!parsed) continue;
        if (parsed.event === "delta" && parsed.data.text) {
          full += parsed.data.text;
          onDelta(parsed.data.text);
        } else if (parsed.event === "done") {
          return { message: parsed.data.message || full };
        } else if (parsed.event === "error") {
          throw new Error(parsed.data.detail || "El asistente falló a mitad de la respuesta.");
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!full.trim()) throw new Error("El asistente no devolvió contenido.");
  return { message: full };
}
