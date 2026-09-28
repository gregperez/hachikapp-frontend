"use client";

import { initials } from "@/lib/format";
import {
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "./session-provider";

const navigation = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Usuarios", icon: Users },
  { href: "/dashboard/roles", label: "Roles y permisos", icon: ShieldCheck },
  { href: "/dashboard/profile", label: "Mi perfil", icon: CircleUserRound },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading, logout } = useSession();

  const activeLabel = navigation.find((item) =>
    item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href),
  )?.label;

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Link href="/dashboard" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark"><ShieldCheck size={21} /></span>
            <span>Base<span>Console</span></span>
          </Link>
          <button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav className="nav-list" aria-label="Navegación principal">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
                <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar avatar-small">{initials(user?.name)}</div>
          <div className="sidebar-user-copy">
            <strong>{loading ? "Cargando…" : user?.name || "Usuario"}</strong>
            <span>{user?.isAdmin ? "Administrador" : "Miembro"}</span>
          </div>
          <button className="icon-button" onClick={() => void logout()} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={21} />
          </button>
          <div>
            <span className="topbar-eyebrow">Base Console</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="topbar-account">
            <div className="avatar avatar-small">{initials(user?.name)}</div>
            <span>{user?.name?.split(" ")[0] || "Cuenta"}</span>
            <ChevronDown size={15} />
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
