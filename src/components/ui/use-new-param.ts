"use client";

import { useEffect, useRef } from "react";

/**
 * Dashboard'dagi tezkor amallar sahifaga `?new=1` bilan o'tadi — shu holatda
 * sahifadagi "yaratish" modali o'zi ochiladi.
 *
 * Parametr ochilishi bilanoq URL'dan olib tashlanadi, shunda sahifa
 * yangilanganda yoki orqaga qaytilganda modal qaytadan ochilib qolmaydi.
 * Qiymat effekt ichida `window.location` dan o'qiladi (useSearchParams emas) —
 * shuning uchun server render'i o'zgarmaydi va hydration farqi bo'lmaydi.
 */
export function useOpenOnNewParam(open: () => void) {
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("new") !== "1") return;
    url.searchParams.delete("new");
    window.history.replaceState(null, "", url.pathname + url.search);
    openRef.current();
  }, []);
}
