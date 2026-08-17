"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { BackLink } from "./back-link";

// ============================================================================
// Sahifa sarlavhasi — 17 ta fayldagi qo'lda yozilgan h1 blokining o'rniga.
//
// Orqaga havolasi berilmasa, u joriy manzildan keltirib chiqariladi. Bo'lim
// ildizining o'zida (dashboard'lar, /admin) havola umuman chizilmaydi: o'ziga
// o'zi havola qiluvchi tugma foydalanuvchini aldaydi. Ildizning istisnolari
// (/admin, /account) sessiyaga bog'liq — client `usePathname` orqali qaysi
// dashboard "uy" ekanini bilolmaydi, shuning uchun ular `backHref` ni server
// sahifasidan prop qilib uzatadi.
// ============================================================================

/** 17 ta fayl takrorlaydigan h1 sinfi — aynan shu qator saqlanadi. */
export const PAGE_TITLE_CLASS = "text-2xl font-semibold tracking-tight text-fg";

export interface SectionRoot {
  href: string;
  label: string;
}

/** Yakuniy "/" ni olib tashlaydi — "/fleet/dashboard/" ham ildiz sifatida tanilsin. */
function normalize(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function sectionRootFor(pathname: string): SectionRoot {
  const section = normalize(pathname).split("/").filter(Boolean)[0];

  switch (section) {
    case "fleet":
      return { href: "/fleet/dashboard", label: "Back to Fleet" };
    case "safety":
      return { href: "/safety/dashboard", label: "Back to Safety" };
    case "admin":
      return { href: "/admin", label: "Back to Admin" };
    default:
      return { href: "/", label: "Back" };
  }
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Berilmasa — `sectionRootFor(usePathname())`.
   * `null` — havolani ataylab o'chiradi (keltirib chiqarilgani ham chizilmaydi).
   */
  backHref?: string | null;
  /** Berilmasa — maqsad manzilidan: "Back to Fleet" / "Back to Safety" / "Back to Admin". */
  backLabel?: string;
  /** O'ng tarafdagi tugmalar (Add, Export, ...). */
  actions?: React.ReactNode;
  /** Sarlavha ostidagi qo'shimcha qator (tab'lar, KPI kartalar). */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  children,
  className,
}: PageHeaderProps): React.ReactElement {
  const pathname = usePathname();
  const derived = sectionRootFor(pathname);

  // Ildizning o'zida (/fleet/dashboard, /safety/dashboard, /admin) keltirib
  // chiqarilgan manzil joriy sahifaning o'zi bo'ladi — bunday havola chizilmaydi.
  const target =
    backHref !== undefined ? backHref : derived.href === normalize(pathname) ? null : derived.href;
  const label = backLabel ?? (target === null ? derived.label : sectionRootFor(target).label);

  return (
    <div className={className}>
      {target ? (
        <div className="mb-4">
          <BackLink href={target} label={label} />
        </div>
      ) : null}

      {/* Kichik ekranda `flex-wrap` amallarni sarlavha ostiga tushiradi; `min-w-0`
          uzun sarlavhaning konteynerdan toshib chiqishiga yo'l qo'ymaydi. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 break-words">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
