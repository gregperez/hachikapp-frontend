"use client";

import { LoadingState, PageHeader, StatusBadge } from "@/components/ui";
import { useSession } from "@/components/session-provider";
import { api, dataOf } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import type { ApiEnvelope, CursorPage, Role, User } from "@/lib/types";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api<ApiEnvelope<CursorPage<User>>>("v1/users?limit=5"),
      api<ApiEnvelope<CursorPage<Role>>>("v1/roles?limit=100"),
      api("health/ready"),
    ]).then(([usersResult, rolesResult, healthResult]) => {
      if (usersResult.status === "fulfilled") setUsers(dataOf(usersResult.value).data || []);
      if (rolesResult.status === "fulfilled") setRoles(dataOf(rolesResult.value).data || []);
      setApiOnline(healthResult.status === "fulfilled");
      setLoading(false);
    });
  }, []);

  const activeUsers = users.filter((item) => item.active).length;

  return (
    <>
      <PageHeader
        eyebrow="VISTA GENERAL"
        title={`Hola, ${user?.name?.split(" ")[0] || "bienvenido"}`}
        description="Este es el pulso actual de tu espacio de trabajo."
        actions={<span className={`api-pill ${apiOnline ? "online" : "offline"}`}><i /> API {apiOnline ? "operativa" : "sin conexión"}</span>}
      />

      <section className="welcome-banner">
        <div>
          <span className="banner-icon"><Sparkles size={19} /></span>
          <h2>Todo en orden por aquí.</h2>
          <p>Tu panel concentra las acciones clave para mantener usuarios y accesos al día.</p>
        </div>
        <Link href="/dashboard/users" className="button button-on-dark">Gestionar usuarios <ArrowRight size={17} /></Link>
      </section>

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-icon indigo"><Users size={21} /></span>
          <div><p>Usuarios visibles</p><strong>{loading ? "—" : users.length}</strong><small>En la página más reciente</small></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon green"><UserCheck size={21} /></span>
          <div><p>Usuarios activos</p><strong>{loading ? "—" : activeUsers}</strong><small>Con acceso habilitado</small></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon amber"><ShieldCheck size={21} /></span>
          <div><p>Roles definidos</p><strong>{loading ? "—" : roles.length}</strong><small>{roles.filter((role) => role.active).length} activos</small></div>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue"><CheckCircle2 size={21} /></span>
          <div><p>Estado del servicio</p><strong className="metric-word">{apiOnline ? "Saludable" : "Revisar"}</strong><small>Backend en localhost:8080</small></div>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Usuarios recientes</h2><p>Últimas cuentas registradas</p></div>
            <Link href="/dashboard/users" className="text-link">Ver todos <ArrowRight size={15} /></Link>
          </div>
          {loading ? <LoadingState /> : users.length === 0 ? (
            <div className="empty-state"><Users size={28} /><p>Aún no hay usuarios para mostrar.</p></div>
          ) : (
            <div className="compact-list">
              {users.map((item) => (
                <div className="compact-user" key={item.id}>
                  <span className="avatar">{initials(item.name)}</span>
                  <div><strong>{item.name}</strong><span>{item.email}</span></div>
                  <StatusBadge active={item.active} />
                  <span className="date-cell"><Clock3 size={14} /> {formatDate(item.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel quick-panel">
          <div className="panel-heading"><div><h2>Acciones rápidas</h2><p>Atajos frecuentes</p></div></div>
          <Link href="/dashboard/users?create=1" className="quick-action"><span className="metric-icon indigo"><Users size={19} /></span><span><strong>Crear usuario</strong><small>Agrega una cuenta al equipo</small></span><ArrowRight size={17} /></Link>
          <Link href="/dashboard/roles?create=1" className="quick-action"><span className="metric-icon amber"><ShieldCheck size={19} /></span><span><strong>Definir un rol</strong><small>Configura accesos granulares</small></span><ArrowRight size={17} /></Link>
          <Link href="/dashboard/profile" className="quick-action"><span className="metric-icon green"><UserCheck size={19} /></span><span><strong>Actualizar perfil</strong><small>Revisa tus datos y seguridad</small></span><ArrowRight size={17} /></Link>
        </section>
      </div>
    </>
  );
}
