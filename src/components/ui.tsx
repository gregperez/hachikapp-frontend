"use client";

import { X } from "lucide-react";

export function StatusBadge({ active, on = "Activo", off = "Inactivo" }: { active: boolean; on?: string; off?: string }) {
  return <span className={`status-badge ${active ? "success" : "neutral"}`}><i />{active ? on : off}</span>;
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Modal({ open, title, description, children, onClose }: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Notice({ message, kind = "success" }: { message?: string; kind?: "success" | "error" }) {
  if (!message) return null;
  return <div className={`notice ${kind}`}>{message}</div>;
}

export function LoadingState() {
  return <div className="loading-state"><span className="spinner" /> Cargando información…</div>;
}
