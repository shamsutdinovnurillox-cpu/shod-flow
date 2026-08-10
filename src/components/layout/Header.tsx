"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSession, signOut } from "next-auth/react";
import { Bell, ChevronRight, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { getNotifications } from "@/app/actions/notifications";
import type { Notification } from "@prisma/client";
import { cn } from "@/lib/utils";

// ============================================================================
// Buyruq-markazi uslubidagi header: kontekst (breadcrumb), ⌘K qidiruv,
// ogohlantirishlar, tema va profil menyusi.
// ============================================================================

const SEGMENT_LABELS: Record<string, string> = {
  fleet: "Fleet",
  safety: "Safety",
  admin: "Admin",
  dashboard: "Overview",
  trucks: "Trucks",
  trailers: "Trailers",
  devices: "Devices",
  services: "Services",
  expenses: "Expenses",
  documents: "Documents",
  notifications: "Notifications",
  drivers: "Drivers",
  insurance: "Insurance",
  accidents: "Accidents",
  "cargo-claims": "Cargo Claims",
  inspections: "Inspections",
  users: "Users & roles",
  account: "Account",
};

const isId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s) || /^\d+$/.test(s);

function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs = parts.map((seg, i) => ({
    label: isId(seg) ? "Detail" : SEGMENT_LABELS[seg] ?? seg.replace(/-/g, " "),
    href: "/" + parts.slice(0, i + 1).join("/"),
    // Bo'lim ildizi (/fleet) o'zi sahifa emas — bosilmaydi.
    linkable: i > 0 && !isId(seg),
  }));

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" />}
          {i === crumbs.length - 1 ? (
            <span className="truncate font-medium text-fg">{c.label}</span>
          ) : c.linkable ? (
            <Link href={c.href} className="truncate text-muted transition-colors hover:text-fg">
              {c.label}
            </Link>
          ) : (
            <span className="truncate text-muted">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

const PRIORITY_TONE: Record<string, string> = {
  CRITICAL: "text-danger",
  HIGH: "text-warning",
  MEDIUM: "text-[var(--series-4)]",
  LOW: "text-muted",
};

function NotificationsBell() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const dept = session?.user?.department;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getNotifications(dept === "FLEET" || dept === "SAFETY" ? dept : undefined)
      .then((n) => !cancelled && setItems(n))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, dept]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const urgent = items.filter((n) => n.priority === "CRITICAL" || n.priority === "HIGH").length;
  const href = dept === "SAFETY" ? "/safety/notifications" : "/fleet/notifications";

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Alerts (${items.length})`}
        aria-expanded={open}
        className="btn btn-ghost btn-icon relative"
      >
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span
            className={cn(
              "absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-surface",
              urgent > 0 ? "bg-danger" : "bg-[var(--accent)]"
            )}
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] animate-slide-up overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <span className="text-sm font-semibold text-fg">Alerts</span>
            <span className="badge badge-neutral">{items.length} open</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Nothing needs attention.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {items.slice(0, 6).map((n) => (
                <li key={n.id}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <span className={cn("dot mt-1.5", PRIORITY_TONE[n.priority] ?? "text-muted")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-fg">{n.message}</span>
                      <span className="mt-0.5 block text-[11px] text-faint">
                        {n.priority} · {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={href}
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3.5 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-surface-2"
          >
            View all alerts
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const name = session?.user?.name ?? "—";
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 text-[11px] font-semibold text-white transition-transform hover:scale-105"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 animate-slide-up overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-lg)]">
          <div className="border-b border-border px-3.5 py-3">
            <p className="truncate text-sm font-medium text-fg">{name}</p>
            <p className="truncate text-xs text-muted">{session?.user?.email}</p>
            <p className="mt-1.5 flex gap-1.5">
              <span className="badge badge-primary">{session?.user?.role}</span>
              <span className="badge badge-neutral">{session?.user?.department}</span>
            </p>
          </div>
          <div className="p-1">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg transition-colors hover:bg-surface-2"
            >
              <User className="h-4 w-4 text-muted" /> Account settings
            </Link>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-fg transition-colors hover:bg-surface-2"
            >
              <Settings className="h-4 w-4 text-muted" /> Preferences
            </Link>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Platforma — tashqi manba: serverda noma'lum, shuning uchun `useSyncExternalStore`
// (boshlang'ich render'da "Ctrl", hydration'dan keyin haqiqiy qiymat).
const subscribeNever = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const mac = useSyncExternalStore(subscribeNever, isMac, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-md sm:gap-3 sm:px-5">
        <button onClick={onMenuClick} aria-label="Open navigation" className="btn btn-ghost btn-icon shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <Breadcrumbs />

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          {/* ⌘K tetigi: input emas, panelni ochuvchi tugma. */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2/70 px-2.5 text-sm text-faint transition-colors hover:border-border-strong hover:text-muted sm:w-64 sm:px-3"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden flex-1 text-left sm:block">Search…</span>
            <kbd className="kbd hidden sm:inline-flex">{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>

          <NotificationsBell />
          <ThemeToggle />

          <span className="mx-0.5 hidden h-6 w-px bg-border sm:block" />

          <UserMenu />
        </div>
      </header>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}
