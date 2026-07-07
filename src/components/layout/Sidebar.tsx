"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Truck,
  Container,
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

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const dept = session?.user?.department;
  const permUser = {
    role,
    department: dept,
    permissions: session?.user?.permissions ?? [],
  };

  const groups: NavGroup[] = [];

  if (role === "ADMIN" || dept === "FLEET") {
    groups.push({
      label: "Fleet",
      links: [
        { name: "Dashboard", href: "/fleet/dashboard", icon: LayoutDashboard },
        { name: "Trucks", href: "/fleet/trucks", icon: Truck, key: "fleet.trucks" },
        { name: "Trailers", href: "/fleet/trailers", icon: Container, key: "fleet.trailers" },
        { name: "Services", href: "/fleet/services", icon: Wrench, key: "fleet.services" },
        { name: "Expenses", href: "/fleet/expenses", icon: Receipt, key: "fleet.expenses" },
        { name: "Documents", href: "/fleet/documents", icon: FolderOpen, key: "fleet.documents" },
      ].filter((l) => !l.key || canAccess(permUser, l.key)),
    });
  }

  if (role === "ADMIN" || dept === "SAFETY") {
    groups.push({
      label: "Safety",
      links: [
        { name: "Dashboard", href: "/safety/dashboard", icon: LayoutDashboard },
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
      label: "System",
      links: [
        { name: "Admin Panel", href: "/admin", icon: Settings },
        { name: "Users", href: "/admin/users", icon: UserCog },
      ],
    });
  }

  return (
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white shadow-sm">
          <Truck className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-fg">Shod Flow</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.label} className="mt-5 first:mt-2">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-faint">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-fg shadow-sm"
                          : "text-muted hover:bg-surface-2 hover:text-fg"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-primary-fg" : "text-faint group-hover:text-fg")} />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
