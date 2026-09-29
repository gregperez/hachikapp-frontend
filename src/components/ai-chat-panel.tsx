"use client";

import { consumeSse } from "@/lib/ai-stream";
import { Bot, CornerDownLeft, Send, Sparkles, Square, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hola. Este espacio está preparado para integrar un asistente que ayude con usuarios, roles y operaciones del sistema.",
};

const suggestions = [
  "¿Qué puede hacer este asistente?",
  "Resumir la actividad del sistema",
  "Ayudarme a definir un rol",
];

export function AIChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function stop() {
    abortRef.current?.abort();
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const assistantId = crypto.randomUUID();
    const history = [...messages, userMessage];
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setSending(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payloadMessages = history
        .filter((message) => message.id !== "welcome")
        .map(({ role, content: text }) => ({ role, content: text }));
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, conversationId: conversationId.current }),
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        if (!response.ok) throw new Error("El servicio de IA rechazó la solicitud.");
        setConfigured(true);
        const result = await consumeSse(response, (delta) => {
          setMessages((current) => current.map((message) => (
            message.id === assistantId ? { ...message, content: `${message.content}${delta}` } : message
          )));
        }, controller.signal);
        setMessages((current) => current.map((message) => (
          message.id === assistantId ? { ...message, content: result.message || message.content } : message
        )));
        return;
      }
      const payload = (await response.json().catch(() => null)) as { message?: string; configured?: boolean; detail?: string } | null;
      if (!response.ok) throw new Error(payload?.detail || "No fue posible contactar al asistente.");
      setConfigured(payload?.configured ?? true);
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? { ...message, content: payload?.message || "El asistente no devolvió contenido." }
          : message
      )));
    } catch (caught) {
      if (controller.signal.aborted) {
        setMessages((current) => current.map((message) => (
          message.id === assistantId
            ? { ...message, content: message.content || "Generación cancelada." }
            : message
        )));
        return;
      }
      const detail = caught instanceof Error ? caught.message : "El asistente no está disponible en este momento.";
      setError(detail);
      setMessages((current) => current.map((message) => (
        message.id === assistantId ? { ...message, content: message.content || detail } : message
      )));
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }

  function applySuggestion(suggestion: string) {
    setInput(suggestion);
    inputRef.current?.focus();
  }

  if (!open) return null;

  return (
    <>
      <button className="chat-backdrop" onClick={onClose} aria-label="Cerrar asistente" />
      <aside className="chat-panel" aria-label="Asistente de inteligencia artificial">
        <header className="chat-header">
          <span className="chat-agent-icon"><Bot size={21} /></span>
          <div>
            <div className="chat-title"><strong>Asistente IA</strong><span>Beta</span></div>
            <p><i className={configured ? "online" : ""} /> {configured ? "Conectado" : "Listo para integrar"}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar asistente"><X size={20} /></button>
        </header>

        <div className="chat-messages" ref={scrollRef}>
          <div className="chat-intro">
            <span><Sparkles size={20} /></span>
            <h2>¿En qué puedo ayudarte?</h2>
            <p>Un punto de entrada para asistencia contextual dentro de Base Console.</p>
          </div>
          {messages.map((message) => (
            <div className={`chat-message ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? <Bot size={15} /> : <UserRound size={15} />}</span>
              <div>
                {message.content || (sending ? <span className="typing-dots"><i /><i /><i /></span> : null)}
              </div>
            </div>
          ))}
        </div>

        {messages.length === 1 && (
          <div className="chat-suggestions">
            {suggestions.map((suggestion) => <button key={suggestion} onClick={() => applySuggestion(suggestion)}>{suggestion}</button>)}
          </div>
        )}

        {error && <p className="chat-error" role="alert">{error}</p>}

        <form className="chat-composer" onSubmit={(event) => void submit(event)}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            maxLength={2000}
            rows={1}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje para el asistente"
          />
          {sending ? (
            <button type="button" onClick={stop} aria-label="Detener generación"><Square size={16} /></button>
          ) : (
            <button type="submit" disabled={!input.trim()} aria-label="Enviar mensaje"><Send size={18} /></button>
          )}
          <small><CornerDownLeft size={11} /> Enter para enviar · Shift + Enter para nueva línea</small>
        </form>
      </aside>
    </>
  );
}
