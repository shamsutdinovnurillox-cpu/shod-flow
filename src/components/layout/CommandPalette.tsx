"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  Loader2,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Truck,
  Container,
  Users,
  Cpu,
  Wrench,
  Receipt,
  FolderOpen,
  ShieldCheck,
  AlertTriangle,
  PackageX,
  ClipboardCheck,
  LayoutDashboard,
  Settings,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { globalSearch, type SearchHit } from "@/app/actions/search";
import { canAccess } from "@/lib/modules";
import { cn } from "@/lib/utils";

// ============================================================================
// ⌘K buyruq paneli.
//
// Ikki rejimda ishlaydi: so'rov bo'sh bo'lsa — ruxsat etilgan sahifalar
// ro'yxati (tez navigatsiya), matn kiritilsa — serverdagi global qidiruv.
// Klaviatura bilan to'liq boshqariladi: ↑/↓ tanlash, Enter ochish, Esc yopish.
// ============================================================================

interface NavTarget {
  name: string;
  href: string;
  icon: LucideIcon;
  group: string;
  key?: string;
}

const ALL_TARGETS: NavTarget[] = [
  { name: "Fleet overview", href: "/fleet/dashboard", icon: LayoutDashboard, group: "Fleet" },
  { name: "Trucks", href: "/fleet/trucks", icon: Truck, group: "Fleet", key: "fleet.trucks" },
  { name: "Trailers", href: "/fleet/trailers", icon: Container, group: "Fleet", key: "fleet.trailers" },
  { name: "Devices", href: "/fleet/devices", icon: Cpu, group: "Fleet", key: "fleet.devices" },
  { name: "Services", href: "/fleet/services", icon: Wrench, group: "Fleet", key: "fleet.services" },
  { name: "Expenses", href: "/fleet/expenses", icon: Receipt, group: "Fleet", key: "fleet.expenses" },
  { name: "Fleet documents", href: "/fleet/documents", icon: FolderOpen, group: "Fleet", key: "fleet.documents" },
  { name: "Safety overview", href: "/safety/dashboard", icon: LayoutDashboard, group: "Safety" },
  { name: "Drivers", href: "/safety/drivers", icon: Users, group: "Safety", key: "safety.drivers" },
  { name: "Insurance", href: "/safety/insurance", icon: ShieldCheck, group: "Safety", key: "safety.insurance" },
  { name: "Accidents", href: "/safety/accidents", icon: AlertTriangle, group: "Safety", key: "safety.accidents" },
  { name: "Cargo claims", href: "/safety/cargo-claims", icon: PackageX, group: "Safety", key: "safety.claims" },
  { name: "Inspections", href: "/safety/inspections", icon: ClipboardCheck, group: "Safety", key: "safety.inspections" },
  { name: "Safety documents", href: "/safety/documents", icon: FolderOpen, group: "Safety", key: "safety.documents" },
  { name: "Account settings", href: "/account", icon: Settings, group: "Workspace" },
];

const ADMIN_TARGETS: NavTarget[] = [
  { name: "Admin panel", href: "/admin", icon: Settings, group: "Workspace" },
  { name: "Users & roles", href: "/admin/users", icon: UserCog, group: "Workspace" },
];

const KIND_TONES: Record<string, string> = {
  Truck: "text-[var(--series-1)]",
  Trailer: "text-[var(--series-6)]",
  Driver: "text-[var(--series-3)]",
  Device: "text-[var(--series-2)]",
  CargoClaim: "text-[var(--series-5)]",
  Inspection: "text-[var(--series-4)]",
  Accident: "text-[var(--series-5)]",
  Document: "text-muted",
};

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const targets = useMemo(() => {
    const permUser = {
      role: session?.user?.role,
      department: session?.user?.department,
      permissions: session?.user?.permissions ?? [],
    };
    const dept = session?.user?.department;
    const isAdmin = session?.user?.role === "ADMIN";
    return [...ALL_TARGETS, ...(isAdmin ? ADMIN_TARGETS : [])].filter((t) => {
      if (t.group === "Fleet" && !isAdmin && dept !== "FLEET") return false;
      if (t.group === "Safety" && !isAdmin && dept !== "SAFETY") return false;
      return !t.key || canAccess(permUser, t.key);
    });
  }, [session]);

  // Bo'sh so'rovda navigatsiya, aks holda serverdagi qidiruv natijalari.
  const navMatches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return targets;
    return targets.filter((t) => t.name.toLowerCase().includes(needle));
  }, [q, targets]);

  const rows: Array<{ type: "nav"; item: NavTarget } | { type: "hit"; item: SearchHit }> = [
    ...navMatches.map((item) => ({ type: "nav" as const, item })),
    ...hits.map((item) => ({ type: "hit" as const, item })),
  ];

  // Panel har safar yangidan mount qilinadi (Header uni shartli render qiladi),
  // shuning uchun holatni tozalash shart emas — faqat fokus va scroll qulfi.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
    };
  }, []);

  // Debounced server qidiruvi.
  useEffect(() => {
    if (q.trim().length < 2) {
      const clear = setTimeout(() => setHits([]), 0);
      return () => clearTimeout(clear);
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setHits(await globalSearch(q));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const go = (row: (typeof rows)[number]) => {
    onClose();
    const href = row.type === "nav" ? row.item.href : row.item.href;
    if (href.startsWith("/")) router.push(href);
    else window.open(href, "_blank");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[active]) go(rows[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh] animate-fade-in">
      <button aria-label="Close" onClick={onClose} tabIndex={-1} className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="relative flex max-h-[70vh] w-full max-w-xl animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-xl)]"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Search units, drivers, claims — or jump to a page…"
            className="palette-input min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-faint"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-faint" />}
          <kbd className="kbd shrink-0">esc</kbd>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-muted">
              {q.trim().length < 2
                ? "Start typing to search"
                : loading
                  ? "Searching…"
                  : "No results found."}
            </p>
          ) : (
            <>
              {navMatches.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
                  Navigate
                </p>
              )}
              {navMatches.map((t, i) => {
                const idx = i;
                const Icon = t.icon;
                return (
                  <button
                    key={t.href}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go({ type: "nav", item: t })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      idx === active ? "bg-primary-soft" : "hover:bg-surface-2"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{t.name}</span>
                    <span className="shrink-0 text-[11px] text-faint">{t.group}</span>
                  </button>
                );
              })}

              {hits.length > 0 && (
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
                  Records
                </p>
              )}
              {hits.map((h, j) => {
                const idx = navMatches.length + j;
                return (
                  <button
                    key={`${h.kind}-${h.id}`}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go({ type: "hit", item: h })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                      idx === active ? "bg-primary-soft" : "hover:bg-surface-2"
                    )}
                  >
                    <span className={cn("dot", KIND_TONES[h.kind] ?? "text-muted")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{h.title}</span>
                      <span className="block truncate text-xs text-muted">{h.subtitle}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-faint">{h.kind}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 border-t border-border bg-surface-2/60 px-4 py-2 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <ArrowUp className="h-3 w-3" />
            <ArrowDown className="h-3 w-3" />
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3 w-3" />
            open
          </span>
          <span className="ml-auto">Shod Flow</span>
        </div>
      </div>
    </div>
  );
}
