"use client";

import { useEffect, useState } from "react";
import { XCircle, X } from "lucide-react";

// ============================================================================
// Minimal toast tizimi: alert() o'rniga inline xato ko'rsatish.
// showError(...) istalgan client komponentdan chaqiriladi; <Toaster /> esa
// (app) layoutda bir marta o'rnatiladi va CustomEvent orqali xabar oladi.
// ============================================================================

const EVENT_NAME = "shodflow:toast";

export function showError(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { message } }));
}

interface ToastItem {
  id: number;
  message: string;
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    const onToast = (e: Event) => {
      const { message } = (e as CustomEvent<{ message: string }>).detail;
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
    };
    window.addEventListener(EVENT_NAME, onToast);
    return () => window.removeEventListener(EVENT_NAME, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[100] flex max-w-sm flex-col gap-2 sm:inset-x-auto sm:right-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 shadow-[var(--shadow-lg)]"
        >
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="min-w-0 break-words">{t.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="ml-auto shrink-0 rounded-md p-0.5 text-red-400 transition-colors hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
