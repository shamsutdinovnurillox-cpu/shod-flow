"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, Field, type ModalSize } from "@/components/ui/profile";
import { cn } from "@/lib/utils";
import type { FieldMode } from "@/lib/field-spec";

// ============================================================================
// Tasdiqlash / so'rov oynasi — native confirm() va prompt() o'rniga.
//
// Nega: brauzer oynasi ilovaning temasidan tashqarida chiziladi, matnini
// formatlab bo'lmaydi va prompt() faqat bitta matn qaytaradi. Bizga esa
// "Scheduled holatiga o'tkazish uchun Location, Agent, Date, Time kerak"
// kabi bir nechta maydonli so'rov ham kerak.
//
// Chaqirish:
//   const confirm = useConfirm();
//   const ok = await confirm({ title, message, tone: "danger", confirmLabel });
//   if (!ok) return;                       // bekor qilindi
//   const { location, agent } = await confirm({ ..., fields: [...] }) ?? {};
//
// Bekor qilinganda `null`, tasdiqlanganda yig'ilgan qiymatlar obyekti qaytadi
// (maydonlar bo'lmasa — bo'sh obyekt, u ham truthy).
// ============================================================================

// Rejim birligi `@/lib/field-spec` dan keladi — shu oyna ham, forma ham,
// server action ham bitta ta'rifni ko'rishi shart. Bu yerda faqat qayta
// eksport: mavjud importlar `@/components/ui/confirm` dan ham oladi.
export type { FieldMode };

export type ConfirmTone = "default" | "danger";

export type ConfirmFieldType = "text" | "textarea" | "number" | "date" | "time" | "select";

export interface ConfirmFieldOption {
  value: string;
  label: string;
}

/** So'rov oynasidagi bitta maydon. Barcha qiymatlar satr — ilovadagi boshqa
 *  formalar ham xuddi shunday (sana "YYYY-MM-DD", pul "120.50"). */
export interface ConfirmField {
  name: string;
  label: string;
  type?: ConfirmFieldType;
  /** Berilmasa "required". "hidden" — umuman chizilmaydi. */
  mode?: FieldMode;
  /** `type: "select"` uchun. */
  options?: readonly ConfirmFieldOption[];
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  /** Ikki ustunli setkada butun qatorni egallaydi (textarea o'zi shunday). */
  fullWidth?: boolean;
}

export type ConfirmValues = Record<string, string>;

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  /** "danger" — qizil tugma va ogohlantirish belgisi (o'chirish, bekor qilish). */
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
  fields?: readonly ConfirmField[];
  /** Berilmasa: maydonli oyna "md", oddiy tasdiq "sm". */
  size?: ModalSize;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  onConfirm: (values: ConfirmValues) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Fokus yordamchilari
// ---------------------------------------------------------------------------

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // Modal paneli va fon tugmasi `tabIndex = -1` — ular tsiklga kirmasligi kerak.
    (el) => el.tabIndex !== -1 && el.offsetParent !== null,
  );
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  title,
  message,
  tone = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  fields,
  size,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement {
  const visibleFields = useMemo(() => (fields ?? []).filter((f) => f.mode !== "hidden"), [fields]);

  const [values, setValues] = useState<ConfirmValues>(() => {
    const initial: ConfirmValues = {};
    for (const f of fields ?? []) {
      if (f.mode !== "hidden") initial[f.name] = f.defaultValue ?? "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLElement | null>(null);

  // Chaqiruvchi element render paytida olinadi: Modal o'zining mount
  // effektida fokusni panelga ko'chiradi, shuning uchun effekt ichida o'qisak
  // tugmani emas, panelni topgan bo'lardik.
  const triggerRef = useRef<HTMLElement | null | undefined>(undefined);
  if (triggerRef.current === undefined) {
    triggerRef.current = typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null);
  }

  // Faqat mount/unmount uchun — bog'liqliklar bo'sh. `onCancel` kabi proplar
  // ota-komponentda har render'da qaytadan yaratiladi; ularni bu yerga
  // qo'shsak, effekt har bosilgan tugmada qayta ishga tushib fokusni tortib
  // olardi. Esc bilan yopish Modal'ning o'zida.
  useEffect(() => {
    const root = formRef.current?.closest<HTMLElement>('[role="dialog"]') ?? null;

    // Maydonlar bo'lsa — bu "prompt", fokus birinchi maydonga; aks holda
    // tasdiqlash tugmasiga (Enter darhol ishlaydi).
    (firstFieldRef.current ?? confirmRef.current)?.focus();

    // Fokus tuzog'i: Modal uni ushlab turmaydi, o'sha faylni esa o'zgartirib
    // bo'lmaydi — shuning uchun panel `closest()` orqali topiladi.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !root) return;
      const items = focusableIn(root);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !root.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Fokusni chaqirgan tugmaga qaytaramiz. Qator o'chirilgan bo'lsa tugma
      // ham DOM'da qolmaydi — shunda hech nimaga tegmaymiz.
      const trigger = triggerRef.current;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const set = (name: string, next: string) => {
    setValues((prev) => ({ ...prev, [name]: next }));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const collected: ConfirmValues = {};
    for (const f of visibleFields) {
      // Trim: bu qiymatlar to'g'ridan-to'g'ri server amaliga ketadi va
      // "   " majburiy maydonni to'ldirilgan ko'rsatmasligi kerak.
      const raw = (values[f.name] ?? "").trim();
      if (f.mode !== "optional" && raw === "") {
        setError(`${f.label} is required.`);
        return;
      }
      collected[f.name] = raw;
    }

    onConfirm(collected);
  };

  const captureFirst = (el: HTMLElement | null) => {
    firstFieldRef.current = el;
  };

  const renderControl = (field: ConfirmField, index: number) => {
    const required = field.mode !== "optional";
    const ref = index === 0 ? captureFirst : undefined;
    const shared = {
      value: values[field.name] ?? "",
      required,
      "aria-label": field.label,
      className: "modal-input",
    };

    if (field.type === "textarea") {
      return (
        <textarea
          {...shared}
          ref={ref}
          rows={3}
          placeholder={field.placeholder}
          onChange={(e) => set(field.name, e.target.value)}
        />
      );
    }
    if (field.type === "select") {
      return (
        <select {...shared} ref={ref} onChange={(e) => set(field.name, e.target.value)}>
          <option value="" disabled={required}>
            {field.placeholder ?? "Select…"}
          </option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        {...shared}
        ref={ref}
        type={field.type ?? "text"}
        placeholder={field.placeholder}
        onChange={(e) => set(field.name, e.target.value)}
      />
    );
  };

  return (
    <Modal title={title} size={size ?? (visibleFields.length > 0 ? "md" : "sm")} onClose={onCancel}>
      <form ref={formRef} onSubmit={handleSubmit}>
        {message && (
          <div className="flex gap-3.5">
            {tone === "danger" && (
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 break-words text-sm text-muted">{message}</div>
          </div>
        )}

        {visibleFields.length > 0 && (
          <div className={cn("grid gap-4 sm:grid-cols-2", message && "mt-5")}>
            {visibleFields.map((field, i) => (
              <Field
                key={field.name}
                // Majburiy maydonlar ko'p bo'ladi, shuning uchun yulduzcha
                // emas — kamchilik bo'lgan ixtiyoriylari belgilanadi.
                label={field.mode === "optional" ? `${field.label} (optional)` : field.label}
                hint={field.hint}
                className={cn((field.fullWidth || field.type === "textarea") && "sm:col-span-2")}
              >
                {renderControl(field, i)}
              </Field>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {/* `ModalActions` ishlatilmadi: uning tugmasi doim `btn-primary`, bu
            yerda esa "danger" ohangi kerak. Tashqi ko'rinish bir xil bo'lishi
            uchun o'sha `modal-footer` klassi. */}
        <div className="modal-footer">
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="submit"
            className={cn("btn", tone === "danger" ? "btn-danger" : "btn-primary")}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Provider + hook
// ---------------------------------------------------------------------------

export type ConfirmFn = (options: ConfirmOptions) => Promise<ConfirmValues | null>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm: <ConfirmProvider> topilmadi — uni (app) layoutga o'rnating.");
  }
  return confirm;
}

interface ConfirmRequest {
  key: number;
  options: ConfirmOptions;
}

/** Layoutda bir marta o'rnatiladi (Toaster kabi). */
export function ConfirmProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolveRef = useRef<((value: ConfirmValues | null) => void) | null>(null);
  const keyRef = useRef(0);

  const settle = useCallback((value: ConfirmValues | null) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setRequest(null);
    resolve?.(value);
  }, []);

  // Bu funksiya barqaror bo'lishi shart: chaqiruvchilar uni useCallback /
  // useEffect bog'liqligiga qo'shadi.
  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<ConfirmValues | null>((resolve) => {
        // Ochiq so'rov ustiga yangisi kelsa, eskisini `null` bilan yopamiz —
        // aks holda uni kutayotgan `await` abadiy osilib qolardi.
        resolveRef.current?.(null);
        resolveRef.current = resolve;
        keyRef.current += 1;
        setRequest({ key: keyRef.current, options });
      }),
    [],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        // `key` — har bir so'rov uchun yangi nusxa: maydon qiymatlari va
        // xatolik oldingi so'rovdan qolib ketmasin.
        <ConfirmDialog
          key={request.key}
          {...request.options}
          onConfirm={(collected) => settle(collected)}
          onCancel={() => settle(null)}
        />
      )}
    </ConfirmContext.Provider>
  );
}
