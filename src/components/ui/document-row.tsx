"use client";

import React from "react";
import Link from "next/link";
import { Download, Eye, FileText, History, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpiryDate, fmtDate, fmtDateTime } from "@/components/ui/expiry";
import { documentTypeLabel, fileHref } from "@/lib/document-types";

// ============================================================================
// Ixcham hujjat qatori — karta emas, bitta chiziq.
//
// Eski karta ko'rinishi ekranga 3 tadan hujjat sig'dirardi va uzun fayl nomi
// kartani cho'zib yuborardi. Shuning uchun qator balandligi qattiq (52px) va
// har bir matn bloki `truncate`: uzun nom qatorni o'stira olmaydi, to'liq
// matn `title` atributida qoladi.
//
// Qatorda hook yo'q — ro'yxatda yuzlab nusxa bo'lishi mumkin. Sana rangi
// `ExpiryDate` zimmasida (u yagona hydration-xavfsiz manba), versiya modali
// esa `onVersions` orqali ota komponentga uzatiladi.
// ============================================================================

/** `ActorStamp` dagi `ActorRef` bilan bir xil shakl (bu fayl mustaqil kompilyatsiya bo'lsin). */
export interface DocumentUploader {
  id: string;
  name: string | null;
  email?: string | null;
}

export interface DocumentRowModel {
  id: string;
  /** Xom `Document.type` — ko'rsatishdan oldin `documentTypeLabel()` dan o'tadi. */
  type: string;
  /** Bazada nullable, shuning uchun bo'sh bo'lsa tur nomi ko'rsatiladi. */
  fileName?: string | null;
  /** Odatda `/api/files/{id}` — yuklab olish havolasini `fileHref()` yasaydi. */
  fileUrl: string;
  issueDate?: Date | string | null;
  expiryDate?: Date | string | null;
  uploader?: DocumentUploader | null;
  uploadedAt?: Date | string | null;
  /** Zanjirdagi jami versiyalar soni (joriysi ham kiradi) — 1 dan katta bo'lsa chip chiqadi. */
  versionCount?: number;
  /** Bog'langan yozuv: "Truck 104" → /fleet/trucks/{id}. `null` — bog'lanmagan. */
  entity?: { label: string; href?: string } | null;
}

export interface DocumentRowHandlers {
  /** Metama'lumot tahriri (tur, sanalar) — fayl `onReplace` orqali almashadi. */
  onEdit?: (doc: DocumentRowModel) => void;
  onReplace?: (doc: DocumentRowModel) => void;
  onDelete?: (doc: DocumentRowModel) => void;
  /** Versiya zanjirini ko'rsatish — modalni ota komponent ochadi. */
  onVersions?: (doc: DocumentRowModel) => void;
  /** Umumiy ro'yxatda — ha; profil paneli ichida ortiqcha. */
  showEntity?: boolean;
  /** O'chirish tugmasi (server ham alohida tekshiradi). */
  canDelete?: boolean;
}

export interface DocumentRowProps extends DocumentRowHandlers {
  doc: DocumentRowModel;
  className?: string;
}

export interface DocumentRowListProps extends DocumentRowHandlers {
  docs: readonly DocumentRowModel[];
  /** Ro'yxat bo'sh bo'lgandagi matn — filtrlangan holat uchun boshqacha bo'lishi mumkin. */
  emptyLabel?: string;
  className?: string;
}

const ICON_BTN =
  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg";

function RowIconLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    // Yangi oynada: yuklab olish javobi sahifani almashtirmasligi kerak —
    // filtrlangan ro'yxat holati yo'qolmasin.
    <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label} className={ICON_BTN}>
      <Icon className="h-4 w-4" />
    </a>
  );
}

function RowIconButton({
  onClick,
  label,
  icon: Icon,
  tone = "default",
}: {
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(ICON_BTN, tone === "danger" && "hover:bg-danger-soft hover:text-danger")}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function DocumentRow({
  doc,
  onEdit,
  onReplace,
  onDelete,
  onVersions,
  showEntity = false,
  canDelete = false,
  className,
}: DocumentRowProps): React.ReactElement {
  const typeLabel = documentTypeLabel(doc.type);
  const fileName = doc.fileName?.trim() ? doc.fileName.trim() : typeLabel;
  // Tugma yorliqlari qaysi hujjat haqida ekanini aytishi shart — ro'yxatda
  // bir xil nomli o'nlab "Download" tugmasi bo'ladi.
  const subject = fileName === typeLabel ? typeLabel : `${typeLabel} — ${fileName}`;

  const stampName = doc.uploader?.name ?? doc.uploader?.email ?? null;
  const stampAt = doc.uploadedAt ? fmtDateTime(doc.uploadedAt) : null;
  const stamp = stampName && stampAt ? `${stampName} · ${stampAt}` : (stampName ?? stampAt ?? "—");

  const versions = doc.versionCount ?? 0;

  return (
    <div className={cn("flex h-[52px] items-center gap-3 px-3 text-sm sm:px-4", className)}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
        <FileText className="h-4 w-4" />
      </span>

      <span
        className="w-28 shrink-0 truncate font-medium text-fg sm:w-44"
        title={typeLabel}
      >
        {typeLabel}
      </span>

      {showEntity && (
        <span className="hidden w-32 shrink-0 truncate md:block" title={doc.entity?.label ?? "Not linked"}>
          {doc.entity ? (
            doc.entity.href ? (
              <Link href={doc.entity.href} className="text-primary hover:underline">
                {doc.entity.label}
              </Link>
            ) : (
              <span className="text-fg">{doc.entity.label}</span>
            )
          ) : (
            <span className="badge badge-neutral">Not linked</span>
          )}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-muted" title={fileName}>
        {fileName}
      </span>

      <span className="hidden w-28 shrink-0 truncate text-right text-muted lg:block" title="Issue date">
        {fmtDate(doc.issueDate)}
      </span>

      <span className="hidden w-32 shrink-0 justify-end truncate text-right sm:flex" title="Expiry date">
        <ExpiryDate date={doc.expiryDate} />
      </span>

      <span className="hidden w-44 shrink-0 truncate text-right text-xs text-faint xl:block" title={stamp}>
        {stamp}
      </span>

      <span className="flex shrink-0 items-center gap-0.5">
        {versions > 1 && onVersions && (
          <button
            type="button"
            onClick={() => onVersions(doc)}
            title={`${versions} versions of ${subject}`}
            aria-label={`Show ${versions} versions of ${subject}`}
            className="badge badge-neutral mr-1 transition-colors hover:bg-surface-hover hover:text-fg"
          >
            <History className="h-3 w-3" />
            {versions}
            <span className="hidden lg:inline">versions</span>
          </button>
        )}

        <RowIconLink href={fileHref(doc)} label={`View ${subject}`} icon={Eye} />
        <RowIconLink href={fileHref(doc, { download: true })} label={`Download ${subject}`} icon={Download} />
        {onEdit && <RowIconButton onClick={() => onEdit(doc)} label={`Edit ${subject}`} icon={Pencil} />}
        {onReplace && (
          <RowIconButton onClick={() => onReplace(doc)} label={`Replace file for ${subject}`} icon={RefreshCw} />
        )}
        {canDelete && onDelete && (
          <RowIconButton onClick={() => onDelete(doc)} label={`Delete ${subject}`} icon={Trash2} tone="danger" />
        )}
      </span>
    </div>
  );
}

/** Qatorlar konteyneri — bitta karta, ichida ajratuvchi chiziqlar va bo'sh holat. */
export function DocumentRowList({
  docs,
  emptyLabel = "No documents.",
  className,
  ...handlers
}: DocumentRowListProps): React.ReactElement {
  if (docs.length === 0) {
    return (
      <div className={cn("card px-4 py-10 text-center text-sm text-muted", className)}>{emptyLabel}</div>
    );
  }

  return (
    <ul className={cn("card divide-y divide-border overflow-hidden", className)}>
      {docs.map((doc) => (
        <li key={doc.id} className="transition-colors hover:bg-surface-hover">
          <DocumentRow doc={doc} {...handlers} />
        </li>
      ))}
    </ul>
  );
}
