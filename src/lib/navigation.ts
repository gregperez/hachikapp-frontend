import { canAccess, isFeatureEnabled } from "@/lib/permissions";
import { ENTITY_IDS, type PermissionRequirement, type User } from "@/lib/types";
import {
  Bot,
  LayoutDashboard,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavActionId = "open-ai-chat";

type NavItemBase = {
  id: string;
  label: string;
  icon: LucideIcon;
  requiredPermission?: PermissionRequirement;
  adminOnly?: boolean;
  featureFlag?: string;
  badge?: string;
};

export type NavLinkItem = NavItemBase & {
  kind: "link";
  href: string;
};

export type NavActionItem = NavItemBase & {
  kind: "action";
  action: NavActionId;
};

export type NavItem = NavLinkItem | NavActionItem;

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "home",
    label: "Inicio",
    items: [
      {
        id: "dashboard",
        kind: "link",
        href: "/dashboard",
        label: "Resumen",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    items: [
      {
        id: "users",
        kind: "link",
        href: "/dashboard/users",
        label: "Usuarios",
        icon: Users,
        requiredPermission: { entity: ENTITY_IDS.USERS, action: "read" },
      },
      {
        id: "roles",
        kind: "link",
        href: "/dashboard/roles",
        label: "Roles y permisos",
        icon: ShieldCheck,
        requiredPermission: { entity: ENTITY_IDS.ROLES, action: "read" },
      },
    ],
  },
  {
    id: "intelligence",
    label: "Inteligencia",
    items: [
      {
        id: "ai-assistant",
        kind: "action",
        action: "open-ai-chat",
        label: "Asistente IA",
        icon: Bot,
        badge: "Beta",
      },
    ],
  },
];

export function canSeeNavItem(user: User | null | undefined, item: NavItem): boolean {
  if (!isFeatureEnabled(item.featureFlag)) return false;
  if (item.adminOnly && !user?.isAdmin) return false;
  return canAccess(user, item.requiredPermission);
}

export function visibleNavSections(user: User | null | undefined): NavSection[] {
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeNavItem(user, item)),
    }))
    .filter((section) => section.items.length > 0);
}

export function isLinkActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function activeNavLabel(pathname: string, sections: NavSection[]): string | undefined {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind === "link" && isLinkActive(pathname, item.href)) return item.label;
    }
  }
  return undefined;
}
