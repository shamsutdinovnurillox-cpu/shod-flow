"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Truck, ShieldAlert, LayoutDashboard, Settings, Users, FolderOpen, FileText } from "lucide-react";
import { useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const dept = session?.user?.department;

  const links = [];

  if (role === "ADMIN" || dept === "FLEET") {
    links.push({ name: "Fleet Dashboard", href: "/fleet/dashboard", icon: LayoutDashboard });
    links.push({ name: "Trucks", href: "/fleet/trucks", icon: Truck });
    links.push({ name: "Trailers", href: "/fleet/trailers", icon: Truck });
    links.push({ name: "Services", href: "/fleet/services", icon: Settings });
    links.push({ name: "Expenses", href: "/fleet/expenses", icon: FileText });
    links.push({ name: "Documents", href: "/fleet/documents", icon: FolderOpen });
  }

  if (role === "ADMIN" || dept === "SAFETY") {
    links.push({ name: "Safety Dashboard", href: "/safety/dashboard", icon: LayoutDashboard });
    links.push({ name: "Drivers", href: "/safety/drivers", icon: Users });
    links.push({ name: "Insurance", href: "/safety/insurance", icon: ShieldAlert });
    links.push({ name: "Accidents", href: "/safety/accidents", icon: ShieldAlert });
    links.push({ name: "Cargo Claims", href: "/safety/cargo-claims", icon: FileText });
    links.push({ name: "Inspections", href: "/safety/inspections", icon: ShieldAlert });
    links.push({ name: "Safety Docs", href: "/safety/documents", icon: FolderOpen });
  }

  if (role === "ADMIN") {
    links.push({ name: "Admin Panel", href: "/admin", icon: Settings });
  }

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white shadow-xl">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Shod Flow
        </h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
