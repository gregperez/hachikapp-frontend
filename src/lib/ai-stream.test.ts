import { describe, expect, it } from "vitest";
import { consumeSse, parseSseBlock } from "@/lib/ai-stream";

describe("AI SSE contract", () => {
  it("parses delta and done events", () => {
    expect(parseSseBlock("event: delta\ndata: {\"text\":\"hola\"}")).toEqual({
      event: "delta",
      data: { text: "hola" },
    });
    expect(parseSseBlock("event: done\ndata: {\"message\":\"hola mundo\"}")?.data.message).toBe("hola mundo");
  });

  it("streams partial text and surfaces an intermediate error", async () => {
    const body = [
      "event: delta\ndata: {\"text\":\"parcial\"}\n\n",
      "event: error\ndata: {\"detail\":\"proveedor caído\"}\n\n",
    ].join("");
    const response = new Response(body, { headers: { "Content-Type": "text/event-stream" } });
    const deltas: string[] = [];
    await expect(consumeSse(response, (text) => deltas.push(text))).rejects.toThrow("proveedor caído");
    expect(deltas).toEqual(["parcial"]);
  });

  it("assembles a complete streamed message", async () => {
    const body = "event: delta\ndata: {\"text\":\"hola \"}\n\nevent: delta\ndata: {\"text\":\"mundo\"}\n\nevent: done\ndata: {\"message\":\"hola mundo\"}\n\n";
    const response = new Response(body, { headers: { "Content-Type": "text/event-stream" } });
    const result = await consumeSse(response, () => undefined);
    expect(result.message).toBe("hola mundo");
  });
});
