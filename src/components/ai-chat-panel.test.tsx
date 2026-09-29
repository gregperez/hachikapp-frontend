import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIChatPanel } from "./ai-chat-panel";

describe("AIChatPanel", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("streams tokens into the assistant bubble", async () => {
    const user = userEvent.setup();
    const body = "event: delta\ndata: {\"text\":\"Hola \"}\n\nevent: delta\ndata: {\"text\":\"Ada\"}\n\nevent: done\ndata: {\"message\":\"Hola Ada\"}\n\n";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    })));
    render(<AIChatPanel open onClose={() => undefined} />);
    await user.type(screen.getByLabelText("Mensaje para el asistente"), "Hola");
    await user.click(screen.getByLabelText("Enviar mensaje"));
    expect(await screen.findByText("Hola Ada")).toBeInTheDocument();
    expect(screen.getByText("Conectado")).toBeInTheDocument();
  });

  it("keeps partial text and shows a mid-stream error", async () => {
    const user = userEvent.setup();
    const body = "event: delta\ndata: {\"text\":\"parcial\"}\n\nevent: error\ndata: {\"detail\":\"proveedor caído\"}\n\n";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    })));
    render(<AIChatPanel open onClose={() => undefined} />);
    await user.type(screen.getByLabelText("Mensaje para el asistente"), "sigue");
    await user.click(screen.getByLabelText("Enviar mensaje"));
    expect(await screen.findByText("parcial")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("proveedor caído");
  });

  it("cancels an in-flight request with AbortController", async () => {
    const user = userEvent.setup();
    let aborted = false;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          aborted = true;
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        });
      });
    }));
    render(<AIChatPanel open onClose={() => undefined} />);
    await user.type(screen.getByLabelText("Mensaje para el asistente"), "cancela");
    await user.click(screen.getByLabelText("Enviar mensaje"));
    await user.click(await screen.findByLabelText("Detener generación"));
    expect(aborted).toBe(true);
    expect(await screen.findByText("Generación cancelada.")).toBeInTheDocument();
  });
});
