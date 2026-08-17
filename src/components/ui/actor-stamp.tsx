"use client";

import { cn } from "@/lib/utils";
import { fmtDateTime } from "./expiry";

// ============================================================================
// Audit "kim / qachon" shtampi.
//
// Asosiy qoida: aktyor hech qachon to'qib chiqarilmaydi. Yozuv audit
// joriy qilinishidan oldin yaratilgan bo'lsa, u yerda foydalanuvchi yo'q —
// va shunda "—" (yoki `legacyLabel`) chiziladi, tasodifiy tanlangan odam emas.
//
// Ko'p voqeali yozuvlar uchun `ActorStampList` bor. U sodir bo'lmagan
// voqealarni butunlay tashlab ketadi: to'rtta qator "—" ma'lumot emas, shovqin.
//
// "use client" — `fmtDateTime` client moduli (expiry.tsx) dan keladi.
// Prop'larning hammasi serializable, shuning uchun server komponentdan ham
// bemalol chizsa bo'ladi.
// ============================================================================

/** Prisma `User` relationining shtampga kerakli qismi. */
export interface ActorRef {
  id: string;
  name: string | null;
  email?: string | null;
}

/**
 * Aktyor manbai: to'liq relation, tayyor ism (masalan audit JSON'idagi
 * snapshot) yoki NULL.
 */
export type ActorLike = ActorRef | string | null | undefined;

/** `ActorStampList` uchun bitta voqea (created / updated / closed / ...). */
export interface ActorEvent {
  /** React kaliti; berilmasa `prefix` + indeks ishlatiladi. */
  key?: string;
  /** "Created", "Updated", "Closed", "Completed". "Closed by" ham qabul qilinadi. */
  prefix?: string;
  user?: ActorLike;
  at?: Date | string | null;
}

/** Aktyor nomi: name → email → null. Bo'sh satrlar ham "yo'q" deb hisoblanadi. */
function actorName(user: ActorLike): string | null {
  if (typeof user === "string") return user.trim() || null;
  if (!user) return null;
  return user.name?.trim() || user.email?.trim() || null;
}

/**
 * Roadmap prefiks sifatida ham "Created", ham "Closed by" ni ko'rsatadi.
 * "by" ni komponentning o'zi qo'shadi, shuning uchun prefiksdagi oxirgi "by"
 * olib tashlanadi — aks holda "Closed by by John" chiqardi.
 */
function stripBy(prefix: string): string {
  return prefix.replace(/\s+by\s*$/i, "").trim();
}

/** Voqea umuman sodir bo'lganmi? Sana ham, aktyor ham yo'q bo'lsa — yo'q. */
function happened(event: ActorEvent): boolean {
  return Boolean(event.at) || actorName(event.user) !== null;
}

export interface ActorStampProps {
  user?: ActorLike;
  at?: Date | string | null;
  /** Voqea nomi: "Created", "Updated", "Closed by". */
  prefix?: string;
  /** `true` — bitta qator (jadval katagi), `false` — blok (detal paneli). */
  inline?: boolean;
  /** Audit'dan oldingi yozuvlar uchun "—" o'rniga, masalan "Imported (legacy)". */
  legacyLabel?: string;
  className?: string;
}

/** Bitta voqea uchun "kim / qachon" shtampi. */
export function ActorStamp({
  user,
  at,
  prefix,
  inline = false,
  legacyLabel,
  className,
}: ActorStampProps) {
  const name = actorName(user);
  const label = prefix ? stripBy(prefix) : "";
  const fallback = legacyLabel ?? "—";
  const when = at ? fmtDateTime(at) : null;

  if (inline) {
    // Aktyor noma'lum bo'lsa "by" ishlatilmaydi — "Created · —" grammatik
    // jihatdan neytral, "Created by —" esa aktyor bor deb o'qiladi.
    const head = name
      ? label
        ? `${label} by ${name}`
        : name
      : label
        ? `${label} · ${fallback}`
        : fallback;

    return (
      <span
        className={cn(
          "inline-flex min-w-0 max-w-full items-baseline gap-1.5 text-xs text-muted",
          className
        )}
      >
        <span className={cn("truncate", name ? "text-fg" : "text-muted")}>{head}</span>
        {when !== null && (
          <>
            <span aria-hidden="true" className="shrink-0 text-faint">
              ·
            </span>
            <span className="shrink-0 whitespace-nowrap">{when}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      ) : null}
      <p className={cn("truncate text-sm font-medium", name ? "text-fg" : "text-muted")}>
        {name ?? fallback}
      </p>
      {when !== null && <p className="mt-0.5 text-xs text-muted">{when}</p>}
    </div>
  );
}

export interface ActorStampListProps {
  /** Tartib — chizilish tartibi. Sodir bo'lmaganlari tushirib qoldiriladi. */
  events: readonly ActorEvent[];
  /** `true` — bitta qatorga sig'adigan variant (jadval katagi). */
  inline?: boolean;
  legacyLabel?: string;
  /** Bitta ham voqea qolmaganda (yozuv audit'dan oldin yaratilgan). */
  emptyLabel?: string;
  className?: string;
}

/**
 * Bir yozuvning bir nechta voqeasi — ixcham definition list ko'rinishida.
 * Sana ham, aktyor ham yo'q voqealar chizilmaydi; hammasi bo'sh bo'lsa,
 * butun blok o'rniga bitta "—" chiqadi.
 */
export function ActorStampList({
  events,
  inline = false,
  legacyLabel,
  emptyLabel = "—",
  className,
}: ActorStampListProps) {
  const shown = events.filter(happened);
  const fallback = legacyLabel ?? "—";

  if (shown.length === 0) {
    return (
      <p className={cn("text-muted", inline ? "text-xs" : "text-sm", className)}>{emptyLabel}</p>
    );
  }

  const rows = shown.map((event, i) => ({
    key: event.key ?? `${event.prefix ?? "event"}-${i}`,
    label: event.prefix ? stripBy(event.prefix) : "",
    name: actorName(event.user),
    when: event.at ? fmtDateTime(event.at) : null,
  }));

  if (inline) {
    return (
      <dl
        className={cn(
          "flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-0.5 text-xs text-muted",
          className
        )}
      >
        {rows.map((row) => (
          <div key={row.key} className="flex min-w-0 items-baseline gap-1.5">
            {/* Yorliqsiz voqeada ham <dd> yolg'iz qolmasligi uchun sr-only <dt>. */}
            <dt className={row.label ? "shrink-0 font-medium text-faint" : "sr-only"}>
              {row.label || "Actor"}
            </dt>
            <dd className={cn("min-w-0 truncate", row.name ? "text-fg" : "text-muted")}>
              {row.name ?? fallback}
            </dd>
            {row.when !== null && (
              <dd className="shrink-0 whitespace-nowrap">
                <span aria-hidden="true" className="text-faint">
                  ·
                </span>{" "}
                {row.when}
              </dd>
            )}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("divide-y divide-border/60", className)}>
      {rows.map((row) => (
        <div
          key={row.key}
          // Yorliq ustuni qat'iy kenglikda — shunda qatorlar bir-biriga tekis
          // tushadi (har bir qator alohida grid bo'lsa ham).
          className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2 first:pt-0 last:pb-0"
        >
          <dt className={row.label ? "text-xs font-medium uppercase tracking-wide text-faint" : "sr-only"}>
            {row.label || "Actor"}
          </dt>
          <dd className={cn("min-w-0 truncate text-sm font-medium", row.name ? "text-fg" : "text-muted")}>
            {row.name ?? fallback}
          </dd>
          {row.when !== null && (
            <dd className="col-start-2 mt-0.5 text-xs text-muted">{row.when}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}

/**
 * Audit ustunlari bo'lgan yozuv. Maydonlar ixtiyoriy — har bir model to'rttasini
 * ham saqlamaydi (Service'da `completedBy`, Assignment'da `closedBy` bor).
 */
export interface AuditedRecord {
  createdBy?: ActorLike;
  createdAt?: Date | string | null;
  updatedBy?: ActorLike;
  updatedAt?: Date | string | null;
  completedBy?: ActorLike;
  completedAt?: Date | string | null;
  closedBy?: ActorLike;
  closedAt?: Date | string | null;
}

/**
 * Yozuvdan `ActorStampList` uchun voqealar ro'yxatini yig'adi. Tartib — hayotiy
 * ketma-ketlik bo'yicha; sodir bo'lmaganlarini `ActorStampList` o'zi tashlaydi.
 */
export function auditEvents(record: AuditedRecord): ActorEvent[] {
  return [
    { key: "created", prefix: "Created", user: record.createdBy, at: record.createdAt },
    { key: "updated", prefix: "Updated", user: record.updatedBy, at: record.updatedAt },
    { key: "completed", prefix: "Completed", user: record.completedBy, at: record.completedAt },
    { key: "closed", prefix: "Closed", user: record.closedBy, at: record.closedAt },
  ];
}
