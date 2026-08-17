"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// "Orqaga" — bu bir pog'ona YUQORIGA, hech qachon router.back() emas.
//
// Foydalanuvchi detal sahifasiga ⌘K palitrasi, bildirishnoma qo'ng'irog'i va
// o'zaro havolalar orqali ham kiradi — brauzer tarixi uni butunlay begona
// bo'limga uloqtirar edi. Shuning uchun `href` doim ustuvor.
//
// Tarix faqat `href` noma'lum bo'lgandagi zaxira yo'l, va u ham referrer shu
// saytdan bo'lsagina: tashqi saytdan (yoki yangi tabda) kelganda history.back()
// foydalanuvchini ilovadan butunlay chiqarib yuborardi.
// ============================================================================

/**
 * 8 ta detal sahifasi bugun qo'lda takrorlaydigan sinf qatori.
 * Ko'rinish bir piksel ham surilmasligi uchun aynan shu holda saqlanadi.
 */
export const BACK_LINK_CLASS = "inline-flex items-center gap-2 text-sm text-muted hover:text-fg";

export interface BackLinkProps {
  /** Bir pog'ona yuqoridagi manzil. Berilmasa — tarix, u ham yaroqsiz bo'lsa `fallbackHref`. */
  href?: string;
  label: string;
  /** Tarixdan foydalanib bo'lmaganda boriladigan manzil. */
  fallbackHref?: string;
  className?: string;
}

export function BackLink({ href, label, fallbackHref = "/", className }: BackLinkProps): React.ReactElement {
  const router = useRouter();

  const goBack = useCallback(() => {
    // `document.referrer` render paytida emas, bosilganda o'qiladi: serverda
    // `document` yo'q va uni render ichida tekshirish SSR/hydration natijasini
    // farqlantirib yuborardi.
    let sameOrigin = false;
    try {
      sameOrigin = document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
    } catch {
      // Buzuq referrer — tarixga ishonmaymiz.
      sameOrigin = false;
    }

    if (sameOrigin && window.history.length > 1) {
      window.history.back();
      return;
    }
    router.push(fallbackHref);
  }, [router, fallbackHref]);

  if (href) {
    return (
      <Link href={href} className={cn(BACK_LINK_CLASS, className)}>
        <ArrowLeft className="h-4 w-4" /> {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={goBack} className={cn(BACK_LINK_CLASS, className)}>
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
