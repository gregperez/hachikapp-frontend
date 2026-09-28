"use client";

import { LoadingState, Modal, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { api, dataOf, errorMessage } from "@/lib/api";
import type { ApiEnvelope, CursorPage, Permission, Role } from "@/lib/types";
import { Edit3, KeyRound, Plus, Route, ShieldCheck, Users } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

const resources = [
  { id: "USERS", label: "Usuarios", icon: Users },
  { id: "ROLES", label: "Roles", icon: ShieldCheck },
] as const;
const actions = ["create", "read", "update", "delete"] as const;
const actionLabels = { create: "Crear", read: "Leer", update: "Editar", delete: "Eliminar" };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  async function loadRoles() {
    setLoading(true);
    try {
      const envelope = await api<ApiEnvelope<CursorPage<Role>>>("v1/roles?limit=100");
      setRoles(dataOf(envelope).data || []);
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoles();
    if (new URLSearchParams(window.location.search).get("create")) setEditing("new");
  }, []);

  async function toggleRole(role: Role) {
    try {
      await api(`v1/roles/${role.id}/change-status`, { method: "PUT", body: JSON.stringify({ active: !role.active }) });
      setNotice({ message: `Rol ${role.active ? "desactivado" : "activado"}.`, kind: "success" });
      await loadRoles();
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AUTORIZACIÓN"
        title="Roles y permisos"
        description="Diseña perfiles de acceso claros y fáciles de auditar."
        actions={<button className="button primary" onClick={() => setEditing("new")}><Plus size={17} /> Nuevo rol</button>}
      />
      <Notice message={notice?.message} kind={notice?.kind} />

      {loading ? <section className="panel"><LoadingState /></section> : roles.length === 0 ? (
        <section className="panel empty-state"><ShieldCheck size={34} /><h3>Aún no hay roles</h3><p>Crea el primero para comenzar a delegar accesos.</p><button className="button primary" onClick={() => setEditing("new")}><Plus size={17} /> Crear rol</button></section>
      ) : (
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.id}>
              <div className="role-card-top">
                <span className="role-icon"><ShieldCheck size={22} /></span>
                <StatusBadge active={role.active} />
              </div>
              <h2>{role.name}</h2>
              <p>{role.permissions?.length || 0} recursos configurados con permisos granulares.</p>
              <div className="role-meta">
                <span><Route size={15} /> {(role.routes || []).length} rutas</span>
                <span><KeyRound size={15} /> {(role.permissions || []).reduce((count, permission) => count + actions.filter((action) => permission[action]).length, 0)} permisos</span>
              </div>
              <div className="permission-preview">
                {(role.permissions || []).map((permission) => (
                  <div key={permission.entity}><strong>{permission.entity}</strong><span>{actions.filter((action) => permission[action]).map((action) => actionLabels[action]).join(" · ") || "Sin acciones"}</span></div>
                ))}
              </div>
              <div className="role-card-actions">
                <button className="button secondary compact" onClick={() => setEditing(role)}><Edit3 size={16} /> Editar</button>
                <button className="button ghost compact" onClick={() => void toggleRole(role)}>{role.active ? "Desactivar" : "Activar"}</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <RoleModal
        role={editing === "new" ? undefined : editing || undefined}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setNotice({ message: editing === "new" ? "Rol creado correctamente." : "Rol actualizado correctamente.", kind: "success" }); void loadRoles(); }}
      />
    </>
  );
}

function RoleModal({ role, open, onClose, onSaved }: { role?: Role; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(role?.name || "");
    setPermissions(resources.map(({ id }) => {
      const current = role?.permissions?.find((permission) => permission.entity === id);
      return current || { entity: id, create: false, read: false, update: false, delete: false };
    }));
    setError("");
  }, [open, role]);

  function toggle(entity: string, action: typeof actions[number]) {
    setPermissions((values) => values.map((permission) => permission.entity === entity ? { ...permission, [action]: !permission[action] } : permission));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const activePermissions = permissions.filter((permission) => actions.some((action) => permission[action]));
    const payload = { name, routes: activePermissions.map((permission) => permission.entity), permissions: activePermissions };
    try {
      await api(role ? `v1/roles/${role.id}` : "v1/roles", { method: role ? "PUT" : "POST", body: JSON.stringify(payload) });
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={role ? "Editar rol" : "Nuevo rol"} description="Selecciona exactamente lo que este perfil podrá hacer.">
      <form onSubmit={submit} className="modal-form">
        {error && <div className="form-error">{error}</div>}
        <label>Nombre del rol<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Gestor de usuarios" required /></label>
        <div className="permission-matrix">
          <div className="permission-header"><span>Recurso</span>{actions.map((action) => <span key={action}>{actionLabels[action]}</span>)}</div>
          {resources.map(({ id, label, icon: Icon }) => (
            <div className="permission-row" key={id}>
              <strong><Icon size={17} /> {label}</strong>
              {actions.map((action) => <label className="switch-check" key={action}><input type="checkbox" checked={permissions.find((permission) => permission.entity === id)?.[action] || false} onChange={() => toggle(id, action)} /><span /></label>)}
            </div>
          ))}
        </div>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={submitting}>{submitting ? "Guardando…" : role ? "Guardar cambios" : "Crear rol"}</button></div>
      </form>
    </Modal>
  );
}
