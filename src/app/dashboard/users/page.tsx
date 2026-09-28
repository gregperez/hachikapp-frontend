"use client";

import { LoadingState, Modal, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { api, dataOf, errorMessage } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import type { ApiEnvelope, CursorPage, Role, User } from "@/lib/types";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search, ShieldCheck, UserCog, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState<CursorPage<User> | null>(null);
  const [cursor, setCursor] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [rolesUser, setRolesUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  async function loadUsers(activeCursor = cursor) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (activeCursor) params.set("cursor", activeCursor);
      const envelope = await api<ApiEnvelope<CursorPage<User>>>(`v1/users?${params}`);
      const result = dataOf(envelope);
      setPage(result);
      setUsers(result.data || []);
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers("");
    api<ApiEnvelope<CursorPage<Role>>>("v1/roles?limit=100")
      .then((envelope) => setRoles(dataOf(envelope).data || []))
      .catch(() => undefined);
    if (new URLSearchParams(window.location.search).get("create")) setCreateOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(value)) : users;
  }, [query, users]);

  async function mutateUser(path: string, body: object, success: string) {
    try {
      await api(path, { method: "PUT", body: JSON.stringify(body) });
      setNotice({ message: success, kind: "success" });
      await loadUsers();
    } catch (caught) {
      setNotice({ message: errorMessage(caught), kind: "error" });
    }
  }

  function openRoles(user: User) {
    setRolesUser(user);
    setSelectedRoles((user.roles || []).map((role) => role.id));
  }

  async function saveRoles(event: FormEvent) {
    event.preventDefault();
    if (!rolesUser || selectedRoles.length === 0) return;
    await mutateUser(`v1/users/${rolesUser.id}/roles`, { roleIds: selectedRoles }, "Roles actualizados correctamente.");
    setRolesUser(null);
  }

  function nextPage() {
    if (!page?.nextCursor) return;
    setHistory((values) => [...values, cursor]);
    setCursor(page.nextCursor);
    void loadUsers(page.nextCursor);
  }

  function previousPage() {
    const previous = history.at(-1) ?? "";
    setHistory((values) => values.slice(0, -1));
    setCursor(previous);
    void loadUsers(previous);
  }

  return (
    <>
      <PageHeader
        eyebrow="DIRECTORIO"
        title="Usuarios"
        description="Administra cuentas, estados y asignaciones de acceso."
        actions={<button className="button primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nuevo usuario</button>}
      />
      <Notice message={notice?.message} kind={notice?.kind} />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o correo…" /></div>
          <span className="result-count">{filtered.length} resultados en esta página</span>
        </div>

        {loading ? <LoadingState /> : filtered.length === 0 ? (
          <div className="empty-state"><Users size={30} /><h3>No encontramos usuarios</h3><p>Prueba con otro término o crea una cuenta.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Creado</th><th className="align-right">Acciones</th></tr></thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td><div className="user-cell"><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
                    <td><div className="role-tags">{user.isAdmin && <span className="role-tag admin">Admin</span>}{(user.roles || []).slice(0, 2).map((role) => <span className="role-tag" key={role.id}>{role.name}</span>)}{user.roles?.length > 2 && <span className="role-tag">+{user.roles.length - 2}</span>}</div></td>
                    <td><StatusBadge active={user.active} /></td>
                    <td className="muted-cell">{formatDate(user.createdAt)}</td>
                    <td><div className="row-actions">
                      <button className="icon-button bordered" title="Gestionar roles" onClick={() => openRoles(user)}><ShieldCheck size={17} /></button>
                      <button className="icon-button bordered" title={user.isAdmin ? "Quitar administrador" : "Hacer administrador"} onClick={() => void mutateUser(`v1/users/${user.id}/admin`, { isAdmin: !user.isAdmin }, "Privilegios actualizados.")}><UserCog size={17} /></button>
                      <button className="icon-button bordered" title={user.active ? "Desactivar" : "Activar"} onClick={() => void mutateUser(`v1/users/${user.id}/change-status`, { active: !user.active }, `Usuario ${user.active ? "desactivado" : "activado"}.`)}><MoreHorizontal size={18} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>Página {history.length + 1}</span>
          <div>
            <button className="icon-button bordered" disabled={history.length === 0 || loading} onClick={previousPage} aria-label="Página anterior"><ChevronLeft size={18} /></button>
            <button className="icon-button bordered" disabled={!page?.hasNext || loading} onClick={nextPage} aria-label="Página siguiente"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setNotice({ message: "Usuario creado correctamente.", kind: "success" }); void loadUsers(""); }} />

      <Modal open={Boolean(rolesUser)} onClose={() => setRolesUser(null)} title="Asignar roles" description={`Define los accesos de ${rolesUser?.name || "este usuario"}.`}>
        <form onSubmit={saveRoles} className="modal-form">
          <div className="checkbox-list">
            {roles.map((role) => (
              <label className="checkbox-card" key={role.id}>
                <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={(event) => setSelectedRoles((values) => event.target.checked ? [...values, role.id] : values.filter((id) => id !== role.id))} />
                <span><strong>{role.name}</strong><small>{role.permissions?.length || 0} grupos de permisos</small></span>
                <StatusBadge active={role.active} />
              </label>
            ))}
            {roles.length === 0 && <p className="form-hint">No hay roles disponibles.</p>}
          </div>
          {selectedRoles.length === 0 && <p className="form-hint error-text">Selecciona al menos un rol.</p>}
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setRolesUser(null)}>Cancelar</button><button className="button primary" disabled={selectedRoles.length === 0}>Guardar roles</button></div>
        </form>
      </Modal>
    </>
  );
}

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("v1/users", { method: "POST", body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
      onCreated();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo usuario" description="Crea una cuenta para una persona de tu equipo.">
      <form onSubmit={submit} className="modal-form">
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid two-columns">
          <label>Nombre completo<input name="name" placeholder="Ej. Paula Reyes" required /></label>
          <label>Correo electrónico<input name="email" type="email" placeholder="paula@empresa.com" required /></label>
        </div>
        <label>Contraseña temporal<input name="password" type="password" minLength={12} placeholder="Mínimo 12 caracteres" required /></label>
        <p className="form-hint">Comparte la contraseña por un canal seguro y solicita cambiarla al ingresar.</p>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={submitting}>{submitting ? "Creando…" : "Crear usuario"}</button></div>
      </form>
    </Modal>
  );
}
