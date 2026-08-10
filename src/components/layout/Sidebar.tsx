"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  Truck,
  Container,
  Cpu,
  Wrench,
  Receipt,
  FolderOpen,
  Users,
  ShieldCheck,
  AlertTriangle,
  PackageX,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  UserCog,
  PanelLeftClose,
  X,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { canAccess } from "@/lib/modules";

interface NavLink {
  name: string;
  href: string;
  icon: LucideIcon;
  key?: string; // granular permission kaliti (dashboard'da yo'q — doim ko'rinadi)
}
interface NavGroup {
  label: string;
  links: NavLink[];
}

// ---------------------------------------------------------------------------
// Yig'ilgan holat `<html data-sidebar>` atributida saqlanadi: uni layout'dagi
// inline skript birinchi bo'yashdan oldin qo'yadi, shuning uchun sahifa
// yangilanganda panel "sakramaydi". Kenglik CSS orqali boshqariladi.
// ---------------------------------------------------------------------------
const SIDEBAR_KEY = "sidebar";

function subscribeAttr(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sidebar"] });
  return () => o.disconnect();
}
const isCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribeAttr, isCollapsed, () => false);
}

function toggleCollapsed() {
  const el = document.documentElement;
  const next = el.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
  el.dataset.sidebar = next;
  try {
    localStorage.setItem(SIDEBAR_KEY, next);
  } catch {}
}

function useNavGroups(): NavGroup[] {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const dept = session?.user?.department;
  const permUser = { role, department: dept, permissions: session?.user?.permissions ?? [] };

  const groups: NavGroup[] = [];

  if (role === "ADMIN" || dept === "FLEET") {
    groups.push({
      label: "Fleet operations",
      links: [
        { name: "Overview", href: "/fleet/dashboard", icon: LayoutDashboard },
        { name: "Trucks", href: "/fleet/trucks", icon: Truck, key: "fleet.trucks" },
        { name: "Trailers", href: "/fleet/trailers", icon: Container, key: "fleet.trailers" },
        { name: "Devices", href: "/fleet/devices", icon: Cpu, key: "fleet.devices" },
        { name: "Services", href: "/fleet/services", icon: Wrench, key: "fleet.services" },
        { name: "Expenses", href: "/fleet/expenses", icon: Receipt, key: "fleet.expenses" },
        { name: "Documents", href: "/fleet/documents", icon: FolderOpen, key: "fleet.documents" },
      ].filter((l) => !l.key || canAccess(permUser, l.key)),
    });
  }

  if (role === "ADMIN" || dept === "SAFETY") {
    groups.push({
      label: "Safety & compliance",
      links: [
        { name: "Overview", href: "/safety/dashboard", icon: LayoutDashboard },
        { name: "Drivers", href: "/safety/drivers", icon: Users, key: "safety.drivers" },
        { name: "Insurance", href: "/safety/insurance", icon: ShieldCheck, key: "safety.insurance" },
        { name: "Accidents", href: "/safety/accidents", icon: AlertTriangle, key: "safety.accidents" },
        { name: "Cargo Claims", href: "/safety/cargo-claims", icon: PackageX, key: "safety.claims" },
        { name: "Inspections", href: "/safety/inspections", icon: ClipboardCheck, key: "safety.inspections" },
        { name: "Documents", href: "/safety/documents", icon: FolderOpen, key: "safety.documents" },
      ].filter((l) => !l.key || canAccess(permUser, l.key)),
    });
  }

  if (role === "ADMIN") {
    groups.push({
      label: "Workspace",
      links: [
        { name: "Admin Panel", href: "/admin", icon: Settings },
        { name: "Users & roles", href: "/admin/users", icon: UserCog },
      ],
    });
  }

  return groups;
}

/** Ish maydoni (kompaniya) bloki — relning tepasida. */
function Workspace() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 via-indigo-500 to-cyan-400 text-white shadow-[0_2px_10px_-2px_var(--primary)]">
        <Truck className="h-[18px] w-[18px]" />
      </div>
      <div className="rail-label min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold text-rail-fg">SHOD Express</p>
        <p className="flex items-center gap-1 text-[11px] text-rail-faint">
          Fleet &amp; Safety
          <span className="rounded border border-rail-border px-1 text-[9px] font-semibold uppercase tracking-wide text-rail-muted">
            live
          </span>
        </p>
      </div>
    </div>
  );
}

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      title={link.name}
      className="rail-item"
    >
      <Icon className="h-[17px] w-[17px] shrink-0" />
      <span className="rail-label truncate">{link.name}</span>
    </Link>
  );
}

function NavGroups() {
  const pathname = usePathname();
  const groups = useNavGroups();

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
      {groups.map((group) => (
        <div key={group.label} className="rail-group mt-5 first:mt-1">
          <p className="rail-group-label px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-rail-faint">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.links.map((link) => (
              <li key={link.href}>
                <NavItem
                  link={link}
                  active={pathname === link.href || pathname.startsWith(link.href + "/")}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Relning pastidagi foydalanuvchi bloki. */
function UserBlock() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "—";
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="border-t border-rail-border p-3">
      <div className="flex items-center gap-2.5">
        <Link
          href="/account"
          title="Account settings"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-rail-2"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-[11px] font-semibold text-white">
            {initials}
          </span>
          <span className="rail-label min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-medium text-rail-fg">{name}</span>
            <span className="block truncate text-[11px] text-rail-faint">
              {session?.user?.role} · {session?.user?.department}
            </span>
          </span>
        </Link>
        <Link
          href="/account"
          title="Settings"
          aria-label="Settings"
          className="rail-label grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rail-muted transition-colors hover:bg-rail-2 hover:text-rail-fg"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function CollapseButton() {
  const collapsed = useSidebarCollapsed();
  return (
    <button
      onClick={toggleCollapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-rail-faint transition-colors hover:bg-rail-2 hover:text-rail-fg"
    >
      <PanelLeftClose className="rail-collapse-icon h-4 w-4 shrink-0 transition-transform duration-200" />
      <span className="rail-label">Collapse</span>
    </button>
  );
}

/** Desktop uchun doimiy yon panel. */
export function Sidebar() {
  return (
    <aside className="rail rail-wide hidden h-full shrink-0 flex-col border-r transition-[width] duration-200 ease-out md:flex">
      <div className="flex h-14 shrink-0 items-center">
        <Workspace />
      </div>
      <NavGroups />
      <div className="px-3 pb-1">
        <CollapseButton />
      </div>
      <UserBlock />
    </aside>
  );
}

/** Mobil uchun chetdan chiqadigan panel. */
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  // Sahifa almashganda panel yopiladi.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Ochiq turganda orqa fon scroll qilinmasin + Esc yopadi.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]"
      />
      {/* Mobil panelda `rail-label` doim ko'rinadi — yig'ilgan holat faqat desktopda. */}
      <aside className="rail relative flex h-full w-[272px] max-w-[85vw] animate-slide-in-left flex-col border-r shadow-[var(--shadow-xl)]">
        <div className="flex h-14 shrink-0 items-center justify-between pr-3">
          <Workspace />
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rail-muted transition-colors hover:bg-rail-2 hover:text-rail-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavGroups />
        <UserBlock />
      </aside>
    </div>
  );
}
