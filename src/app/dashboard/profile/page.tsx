"use client";

import { ActiveSessions } from "@/components/active-sessions";
import { Notice, PageHeader, StatusBadge } from "@/components/ui";
import { PasswordPolicy, visiblePasswordChecks } from "@/components/password-policy";
import { useSession } from "@/components/session-provider";
import { useSettings } from "@/components/settings-provider";
import { api, errorMessage } from "@/lib/api";
import { initials } from "@/lib/format";
import { ALLOWED_LOCALES } from "@/lib/settings";
import { KeyRound, LockKeyhole, Mail, Palette, Save, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, refresh } = useSession();
  const { preferences, savePreferences, settings } = useSettings();
  const [name, setName] = useState("");
  const [profileNotice, setProfileNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => setName(user?.name || ""), [user]);
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("linked")) {
      setProfileNotice({ message: "La cuenta de Google quedó vinculada correctamente.", kind: "success" });
    }
  }, []);

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setProfileNotice(null);
    try {
      await api("v1/users/me", { method: "PUT", body: JSON.stringify({ name }) });
      await refresh();
      setProfileNotice({ message: "Tu perfil fue actualizado.", kind: "success" });
    } catch (caught) {
      setProfileNotice({ message: errorMessage(caught), kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice(null);
    if (!visiblePasswordChecks(newPassword, user?.name, user?.email).valid) {
      setPasswordNotice({ message: "La contraseña nueva no cumple los requisitos indicados.", kind: "error" });
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordNotice({ message: "La confirmación no coincide con la contraseña nueva.", kind: "error" });
      return;
    }
    try {
      await api("v1/users/me/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setPasswordNotice({ message: "Contraseña actualizada. Las otras sesiones fueron revocadas.", kind: "success" });
    } catch (caught) {
      setPasswordNotice({ message: errorMessage(caught), kind: "error" });
    }
  }

  return (
    <>
      <PageHeader eyebrow="CUENTA" title="Mi perfil" description="Mantén tus datos y credenciales siempre actualizados." />

      <section className="profile-hero panel">
        <div className="avatar avatar-xl">{initials(user?.name)}</div>
        <div><h2>{user?.name || "Cargando…"}</h2><p>{user?.email}</p><div className="profile-badges"><StatusBadge active={user?.active ?? true} />{user?.isAdmin && <span className="role-tag admin">Administrador</span>}</div></div>
        <div className="profile-hero-meta"><span><ShieldCheck size={16} /> {user?.roles?.length || 0} roles asignados</span><span><KeyRound size={16} /> {user?.permissions?.length || 0} grupos de permisos</span></div>
      </section>

      <div className="profile-grid">
        <section className="panel form-panel">
          <div className="panel-heading icon-heading"><span className="metric-icon indigo"><UserRound size={20} /></span><div><h2>Información personal</h2><p>Datos visibles en el espacio de trabajo</p></div></div>
          <Notice message={profileNotice?.message} kind={profileNotice?.kind} />
          <form className="modal-form" onSubmit={updateProfile}>
            <label>Nombre completo<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label>Correo electrónico<span className="input-with-icon disabled"><Mail size={17} /><input value={user?.email || ""} disabled /></span></label>
            <p className="form-hint">El correo solo puede ser modificado por un administrador.</p>
            <div className="form-submit"><button className="button primary" disabled={saving || name === user?.name}><Save size={17} /> {saving ? "Guardando…" : "Guardar cambios"}</button></div>
          </form>
        </section>

        <section id="seguridad" className="panel form-panel">
          <div className="panel-heading icon-heading"><span className="metric-icon amber"><LockKeyhole size={20} /></span><div><h2>Seguridad</h2><p>Actualiza tu contraseña de acceso</p></div></div>
          <Notice message={passwordNotice?.message} kind={passwordNotice?.kind} />
          <form className="modal-form" onSubmit={changePassword}>
            <label>Contraseña actual<input name="currentPassword" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
            <div className="form-grid two-columns">
              <label>Nueva contraseña<input name="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={15} maxLength={128} autoComplete="new-password" required /></label>
              <label>Confirmar contraseña<input name="confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={15} maxLength={128} autoComplete="new-password" required /></label>
            </div>
            <PasswordPolicy password={newPassword} name={user?.name} email={user?.email} />
            <p className="form-hint">El cambio revocará las demás sesiones activas.</p>
            <div className="form-submit"><button className="button primary"><KeyRound size={17} /> Actualizar contraseña</button></div>
          </form>
        </section>
      </div>

      <section className="panel form-panel">
        <div className="panel-heading icon-heading"><span className="metric-icon blue"><Palette size={20} /></span><div><h2>Preferencias personales</h2><p>Tema, idioma y zona horaria de este dispositivo. No se mezclan con la configuración administrativa.</p></div></div>
        <form className="modal-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid two-columns">
            <label>Tema
              <select value={preferences.theme} onChange={(event) => savePreferences({ ...preferences, theme: event.target.value as typeof preferences.theme })}>
                <option value="system">Sistema</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </label>
            <label>Idioma
              <select value={preferences.locale} onChange={(event) => savePreferences({ ...preferences, locale: event.target.value })}>
                <option value="">Igual que la consola ({settings.defaultLocale})</option>
                {ALLOWED_LOCALES.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
              </select>
            </label>
            <label>Zona horaria
              <input
                value={preferences.timeZone}
                onChange={(event) => savePreferences({ ...preferences, timeZone: event.target.value })}
                placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
              />
            </label>
          </div>
        </form>
      </section>

      <div className="profile-sessions">
        <ActiveSessions />
      </div>
    </>
  );
}
