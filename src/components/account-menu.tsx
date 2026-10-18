"use client";

import { useDismissible } from "@/hooks/use-dismissible";
import { initials } from "@/lib/format";
import type { User } from "@/lib/types";
import { ChevronDown, CircleUserRound, LockKeyhole, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type FocusEvent } from "react";

const PROFILE_HREF = "/dashboard/profile";
const SECURITY_HREF = "/dashboard/profile#seguridad";
const MENU_ID = "account-menu";

export function AccountMenu({
  user,
  loading,
  onLogout,
}: {
  user: User | null;
  loading: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (!restoreFocus) return;
    triggerRef.current?.focus();
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  const dismiss = useCallback(() => close(true), [close]);

  useDismissible(open, dismiss, rootRef);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (rootRef.current?.contains(event.relatedTarget as Node)) return;
    setOpen(false);
  }

  return (
    <div className="account-menu" ref={rootRef} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="topbar-account account-menu-trigger"
        aria-label="Menú de cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={MENU_ID}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="avatar avatar-small" aria-hidden="true">{initials(user?.name)}</span>
        <span id={labelId}>{loading ? "Cargando…" : user?.name?.split(" ")[0] || "Cuenta"}</span>
        <ChevronDown size={15} className={`account-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul id={MENU_ID} className="account-menu-list" role="menu" aria-labelledby={labelId}>
          <li role="none">
            <Link href={PROFILE_HREF} role="menuitem" onClick={() => close()}>
              <CircleUserRound size={17} aria-hidden="true" />
              Mi perfil
            </Link>
          </li>
          <li role="none">
            <Link href={SECURITY_HREF} role="menuitem" onClick={() => close()}>
              <LockKeyhole size={17} aria-hidden="true" />
              Seguridad
            </Link>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => {
                close();
                void onLogout();
              }}
            >
              <LogOut size={17} aria-hidden="true" />
              Cerrar sesión
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
