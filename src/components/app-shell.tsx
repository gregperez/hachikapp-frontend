"use client";

import { initials } from "@/lib/format";
import {
  activeNavLabel,
  isLinkActive,
  visibleNavSections,
  type NavActionItem,
  type NavItem,
} from "@/lib/navigation";
import { ChevronDown, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession } from "./session-provider";
import { AIChatPanel } from "./ai-chat-panel";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading, logout } = useSession();
  const sections = useMemo(() => visibleNavSections(user), [user]);
  const activeLabel = activeNavLabel(pathname, sections);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleAction(item: NavActionItem) {
    if (item.action === "open-ai-chat") setChatOpen(true);
    closeMenu();
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Link href="/dashboard" className="brand" onClick={closeMenu}>
            <span className="brand-mark"><ShieldCheck size={21} /></span>
            <span>Base<span>Console</span></span>
          </Link>
          <button className="icon-button sidebar-close" onClick={closeMenu} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Navegación principal">
          {sections.map((section) => (
            <div className="nav-section" key={section.id}>
              <p className="nav-caption">{section.label}</p>
              <ul className="nav-list">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <NavEntry
                      item={item}
                      pathname={pathname}
                      chatOpen={chatOpen}
                      onNavigate={closeMenu}
                      onAction={handleAction}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

      {menuOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={closeMenu} />}

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
      <div id="ai-chat-panel"><AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} /></div>
    </div>
  );
}

function NavEntry({
  item,
  pathname,
  chatOpen,
  onNavigate,
  onAction,
}: {
  item: NavItem;
  pathname: string;
  chatOpen: boolean;
  onNavigate: () => void;
  onAction: (item: NavActionItem) => void;
}) {
  if (item.kind === "action") {
    const active = item.action === "open-ai-chat" && chatOpen;
    const Icon = item.icon;
    return (
      <button
        type="button"
        className={`nav-item nav-button ${active ? "active" : ""}`}
        onClick={() => onAction(item)}
        aria-expanded={item.action === "open-ai-chat" ? chatOpen : undefined}
        aria-controls={item.action === "open-ai-chat" ? "ai-chat-panel" : undefined}
      >
        <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
        <span>{item.label}</span>
        {item.badge && <small>{item.badge}</small>}
      </button>
    );
  }

  const active = isLinkActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`nav-item ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
      <span>{item.label}</span>
    </Link>
  );
}
