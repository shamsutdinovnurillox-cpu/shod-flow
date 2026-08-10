"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Umumiy modal oynasi.
//
// Xatti-harakati: Esc yopadi, fon bosilsa yopadi, ochiq turganda sahifa
// scroll'i qulflanadi, fokus panel ichiga ko'chadi. Kontent qismi o'zi
// scroll bo'ladi — shuning uchun forma to'liq balandlikda ochiladi va
// amallar paneli (ModalActions) pastda yopishib turadi.
// ============================================================================

const SIZES = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-6xl",
} as const;

export type ModalSize = keyof typeof SIZES;

export function Modal({
  title,
  description,
  size = "md",
  onClose,
  children,
}: {
  title: string;
  description?: string;
  size?: ModalSize;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // `onClose` odatda har render'da yangi funksiya bo'ladi. Uni quyidagi
  // effekt bog'liqligiga qo'ysak, effekt har bosilgan tugmada qayta ishga
  // tushib fokusni panelga tortib olardi — natijada inputga bitta belgi
  // yozilgach fokus yo'qolardi. Shuning uchun eng oxirgi qiymat ref'da
  // saqlanadi va effekt faqat modal ochilganda bir marta ishlaydi.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Esc bilan yopish + sahifa scroll'ini qulflash + boshlang'ich fokus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in sm:items-center sm:p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-[var(--shadow-xl)]",
          "animate-slide-up outline-none sm:max-h-[88vh] sm:rounded-2xl",
          SIZES[size]
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-fg">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-ghost btn-icon -mr-1.5 -mt-1 h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="modal-body flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Modal pastidagi amallar qatori — kontent scroll bo'lsa ham ko'rinib turadi. */
export function ModalActions({
  loading,
  onCancel,
  submitLabel,
  cancelLabel = "Cancel",
  children,
}: {
  loading: boolean;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  /** Chap tomonga qo'shimcha boshqaruv (masalan, hisob yoki jami). */
  children?: React.ReactNode;
}) {
  return (
    <div className="modal-footer">
      {children && <div className="mr-auto flex items-center">{children}</div>}
      <button type="button" onClick={onCancel} className="btn btn-ghost">
        {cancelLabel}
      </button>
      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {loading ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
