import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { GaugeScore } from "@/components/ui/charts";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

// ============================================================================
// Dashboard kompozitsiyasining qayta ishlatiladigan bloklari.
//
// Bularning barchasi server komponent — ikonka `LucideIcon` sifatida prop
// orqali uzatiladi, shuning uchun bu modulda "use client" bo'lmasligi shart.
// ============================================================================

/**
 * Sahifa boshidagi to'q rangli band: salomlashuv, sana, asosiy ko'rsatkich
 * va tezkor amallar. Oq kartalar to'plamidan vizual jihatdan ajralib turadi.
 */
export function HeroBand({
  greeting,
  title,
  subtitle,
  score,
  scoreLabel,
  scoreHint,
  stats,
  actions,
}: {
  greeting: string;
  title: string;
  subtitle: string;
  score: number;
  scoreLabel: string;
  scoreHint: string;
  stats: { label: string; value: React.ReactNode; tone?: "default" | "warning" | "danger" | "success" }[];
  actions?: React.ReactNode;
}) {
  const toneClass = {
    default: "text-white",
    success: "text-emerald-300",
    warning: "text-amber-300",
    danger: "text-rose-300",
  } as const;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[var(--rail)] text-white shadow-[var(--shadow-lg)]">
      {/* Fon aksentlari — nozik gradient shar'lar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--primary), transparent 65%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 65%)" }}
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:gap-10">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{greeting}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/60">{subtitle}</p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 border-l border-white/10 pl-3 first:border-l-0 first:pl-0 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
                <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  {s.label}
                </dt>
                <dd className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight", toneClass[s.tone ?? "default"])}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>

          {actions && <div className="mt-6">{actions}</div>}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.04] px-6 py-5 ring-1 ring-white/10">
          {/* Gauge o'z ranglarini tokenlardan oladi — to'q fonda ham o'qiladi. */}
          <div className="[&_.text-fg]:text-white [&_.text-muted]:text-white/60">
            <GaugeScore score={score} label={scoreLabel} />
          </div>
          <p className="mt-1 text-sm font-medium text-white/90">{scoreLabel}</p>
          <p className="mt-0.5 max-w-[190px] text-center text-[11px] leading-snug text-white/45">{scoreHint}</p>
        </div>
      </div>
    </section>
  );
}

/** Tezkor amallar — haqiqiy yaratish oqimlarini ochadi (`?new=1`). */
export function QuickActions({
  items,
}: {
  items: { label: string; href: string; icon: LucideIcon }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ label, href, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className="group inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-white/85 ring-1 ring-white/10 transition-all hover:bg-white/[0.12] hover:text-white"
        >
          <Icon className="h-4 w-4 text-[var(--accent)]" />
          {label}
          <ArrowUpRight className="h-3.5 w-3.5 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/60" />
        </Link>
      ))}
    </div>
  );
}

/** Panellar orasidagi bo'lim sarlavhasi. */
export function SectionHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Ixcham KPI bloki. Karta emas — chap chekkasida rangli chiziq bilan
 * ajratilgan qator, shuning uchun bir nechtasi yonma-yon "lenta" hosil qiladi.
 */
export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "var(--primary)",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: string;
  href?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-[3px] rounded-r-full transition-all group-hover:inset-y-2"
        style={{ background: tone }}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="metric-label">{label}</span>
        <Icon className="h-4 w-4 shrink-0 opacity-70" style={{ color: tone }} />
      </div>
      <p className="metric-value mt-2.5">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
    </>
  );

  const className =
    "group relative overflow-hidden rounded-xl border border-border bg-surface px-4 py-3.5 pl-5 shadow-[var(--shadow-xs)] transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)]";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Audit yozuvlaridan tuzilgan faoliyat lentasi. */
export function ActivityFeed({
  entries,
}: {
  entries: {
    id: string;
    action: string;
    entityType: string;
    timestamp: Date | string;
    user: { name: string | null; email: string } | null;
  }[];
}) {
  const ACTION_TONE: Record<string, string> = {
    CREATE: "var(--success)",
    UPDATE: "var(--series-1)",
    DELETE: "var(--danger)",
    STATUS_CHANGE: "var(--series-4)",
    ASSIGN: "var(--series-2)",
    UPLOAD: "var(--series-6)",
  };

  return (
    <div className="panel h-full">
      <div className="panel-head">
        <span className="panel-title">Activity</span>
        <span className="text-[11px] text-faint">last {entries.length}</span>
      </div>
      <div className="panel-body pt-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 pl-4">
            {/* Vertikal vaqt chizig'i. */}
            <span aria-hidden className="absolute bottom-2 left-[3px] top-2 w-px bg-border" />
            {entries.map((e) => (
              <li key={e.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-4 top-1.5 h-[7px] w-[7px] rounded-full ring-2 ring-surface"
                  style={{ background: ACTION_TONE[e.action] ?? "var(--muted)" }}
                />
                <p className="text-[13px] leading-snug text-fg">
                  <span className="font-medium">{e.user?.name ?? e.user?.email ?? "System"}</span>{" "}
                  <span className="text-muted">{e.action.toLowerCase().replace("_", " ")}</span>{" "}
                  <span className="font-medium">{e.entityType}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-faint">
                  {new Date(e.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
