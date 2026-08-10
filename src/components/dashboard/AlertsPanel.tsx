"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showError } from "@/components/ui/toast";
import { updateNotificationStatus } from "@/app/actions/notifications";
import type { Notification } from "@prisma/client";
import {
  AlertOctagon,
  Wrench,
  FileWarning,
  ShieldAlert,
  Activity,
  Check,
  Clock,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Ogohlantirishlar markazi.
//
// Eski panel har bir yozuvni katta rangli blok qilib ko'rsatardi. Bu yerda
// ular kategoriyalarga (tab) ajratiladi va ixcham qatorlar sifatida beriladi:
// ustuvorlik nuqtasi, matn, muddat, amallar. Shu bilan ekranda ancha ko'p
// ma'lumot sig'adi va muhimi darrov ko'rinadi.
// ============================================================================

/** Bog'liq yozuvga to'g'ridan-to'g'ri havola (PRD 4.8, 5.7). */
function notificationHref(n: Notification): string | null {
  switch (n.entityType) {
    case "TRUCK": return `/fleet/trucks/${n.entityId}`;
    case "TRAILER": return `/fleet/trailers/${n.entityId}`;
    case "DRIVER": return `/safety/drivers/${n.entityId}`;
    case "ACCIDENT": return `/safety/accidents/${n.entityId}`;
    case "CLAIM": return `/safety/cargo-claims/${n.entityId}`;
    case "INSPECTION": return `/safety/inspections/${n.entityId}`;
    case "INSURANCE": return `/safety/insurance`;
    case "SERVICE": return `/fleet/services`;
    case "EXPENSE": return `/fleet/expenses`;
    default: return null;
  }
}

type CategoryId = "critical" | "maintenance" | "documents" | "safety" | "all";

interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  tone: string;
  match: (n: Notification) => boolean;
}

const MAINTENANCE_TYPES = ["SERVICE", "TRUCK", "TRAILER", "EXPENSE"];
const SAFETY_TYPES = ["DRIVER", "ACCIDENT", "CLAIM", "INSPECTION", "INSURANCE"];
const isDocAlert = (n: Notification) =>
  n.type.includes("DOC") || n.type.includes("EXPIR") || n.entityType === "DOCUMENT";

const CATEGORIES: Category[] = [
  {
    id: "critical",
    label: "Critical",
    icon: AlertOctagon,
    tone: "var(--danger)",
    match: (n) => n.priority === "CRITICAL" || n.priority === "HIGH",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    tone: "var(--series-4)",
    match: (n) => !isDocAlert(n) && MAINTENANCE_TYPES.includes(n.entityType),
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileWarning,
    tone: "var(--series-2)",
    match: isDocAlert,
  },
  {
    id: "safety",
    label: "Safety",
    icon: ShieldAlert,
    tone: "var(--series-5)",
    match: (n) => !isDocAlert(n) && SAFETY_TYPES.includes(n.entityType),
  },
  { id: "all", label: "All activity", icon: Activity, tone: "var(--muted)", match: () => true },
];

const PRIORITY_TONE: Record<string, string> = {
  CRITICAL: "text-danger",
  HIGH: "text-warning",
  MEDIUM: "text-[var(--series-4)]",
  LOW: "text-faint",
};

export function AlertsPanel({
  notifications,
  viewAllHref,
  limit = 6,
}: {
  notifications: Notification[];
  viewAllHref?: string;
  /** Panelda ko'rsatiladigan qatorlar soni; qolgani "View all" ortida. */
  limit?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<CategoryId>("critical");

  const counts = useMemo(() => {
    const map = {} as Record<CategoryId, number>;
    for (const c of CATEGORIES) map[c.id] = notifications.filter(c.match).length;
    return map;
  }, [notifications]);

  // Bo'sh kategoriya tab sifatida ko'rsatilmaydi (All'dan tashqari).
  const tabs = CATEGORIES.filter((c) => c.id === "all" || counts[c.id] > 0);
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "all";
  const category = CATEGORIES.find((c) => c.id === activeTab)!;
  const rows = notifications.filter(category.match);

  const act = async (id: string, status: "RESOLVED" | "SNOOZED") => {
    setBusy(id);
    try {
      await updateNotificationStatus(id, status);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Amaliyot bajarilmadi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="panel h-full">
      <div className="panel-head">
        <span className="panel-title">Alerts</span>
        <span className="flex items-center gap-2">
          <span className="badge badge-neutral">{notifications.length} open</span>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </span>
      </div>

      {/* Kategoriya tablari */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
        {tabs.map((c) => {
          const Icon = c.icon;
          const on = c.id === activeTab;
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              aria-pressed={on}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                on ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg"
              )}
            >
              <Icon className="h-3.5 w-3.5" style={{ color: on ? c.tone : undefined }} />
              {c.label}
              <span
                className={cn(
                  "rounded px-1 text-[10px] font-semibold tabular-nums",
                  on ? "bg-surface text-fg" : "text-faint"
                )}
              >
                {counts[c.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-success-soft text-success">
              <Check className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-fg">All clear</p>
            <p className="mt-0.5 text-xs text-muted">Nothing in this category needs attention.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.slice(0, limit).map((n) => {
              const href = notificationHref(n);
              return (
                <li key={n.id} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-surface-hover">
                  <span className={cn("dot mt-[7px]", PRIORITY_TONE[n.priority] ?? "text-faint", n.priority === "CRITICAL" && "dot-pulse")} />

                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link href={href} className="block truncate text-[13px] font-medium text-fg hover:underline">
                        {n.message}
                      </Link>
                    ) : (
                      <p className="truncate text-[13px] font-medium text-fg">{n.message}</p>
                    )}
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-faint">
                      <span className="font-semibold uppercase tracking-wide">{n.priority}</span>
                      <span>·</span>
                      <span>{n.entityType.toLowerCase()}</span>
                      {n.dueDate && (
                        <>
                          <span>·</span>
                          <span>due {new Date(n.dueDate).toLocaleDateString()}</span>
                        </>
                      )}
                      {n.status === "SNOOZED" && (
                        <>
                          <span>·</span>
                          <span className="italic">snoozed</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Amallar faqat qator ustiga kelganda ko'rinadi — ro'yxat tinch turadi. */}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    {n.status !== "SNOOZED" && (
                      <button
                        onClick={() => act(n.id, "SNOOZED")}
                        disabled={busy === n.id}
                        title="Snooze"
                        aria-label="Snooze alert"
                        className="btn btn-ghost btn-icon h-7 w-7"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => act(n.id, "RESOLVED")}
                      disabled={busy === n.id}
                      title="Resolve"
                      aria-label="Resolve alert"
                      className="btn btn-ghost btn-icon h-7 w-7 hover:bg-success-soft hover:text-success"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rows.length > limit && viewAllHref && (
        <Link
          href={viewAllHref}
          className="border-t border-border px-4 py-2.5 text-center text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {rows.length - limit} more in {category.label.toLowerCase()}
        </Link>
      )}
    </div>
  );
}
