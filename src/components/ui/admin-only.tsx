"use client";

import React from "react";
import { useSession } from "next-auth/react";

// ============================================================================
// Admin darvozasi.
//
// AFZAL KO'RILGAN YO'L — `isAdmin` ni serverdan prop qilib berish.
// `useSession()` birinchi client render'da `status: "loading"` qaytaradi,
// ya'ni admin tugmasi hydration'dan keyin "paydo bo'ladi" va yonidagi
// boshqaruvlarni surib yuboradi. Sahifalar allaqachon server tarafda guard
// ishlatadi (`requireAdmin` / `auth()`), shuning uchun to'g'ri javob u yerda
// bor — uni prop orqali pastga uzatish kifoya.
//
// `useIsAdmin()` faqat zaxira: server prop'i yo'q, o'zi mustaqil chiziladigan
// client komponentlar uchun. U ham yuklanish paytida `false` qaytaradi —
// admin boshqaruvi hech qachon optimistik chizilmaydi, chunki bir zumda
// ko'rinib keyin yo'qoladigan tugma ruxsat haqida yolg'on ma'lumot beradi.
//
// Diqqat (orkestratorga): fayl "use client" bo'lgani uchun server
// komponentdan `<AdminOnly isAdmin={false}>` ishlatilsa, `children` baribir
// RSC payload'iga serializatsiya qilinadi. Server komponentlarda oddiy
// `{isAdmin && ...}` yozing; bu komponent client komponentlar uchun.
//
// Hech bir holatda bu darvoza xavfsizlik chegarasi emas — server action'lar
// o'zining `requireAdmin` tekshiruvini saqlab qoladi.
// ============================================================================

export interface AdminState {
  isAdmin: boolean;
  /** Sessiya aniqlanganmi. `false` — hali yuklanmoqda, javob noma'lum. */
  ready: boolean;
}

/**
 * Zaxira yo'l: sessiyadan rol o'qiydi. Server prop'i bo'lsa — ishlatmang.
 * Yuklanish paytida `isAdmin: false`, `ready: false`.
 */
export function useAdminState(): AdminState {
  const { data: session, status } = useSession();
  const ready = status !== "loading";
  return { isAdmin: ready && session?.user?.role === "ADMIN", ready };
}

/** `useAdminState().isAdmin` ning qisqartmasi. */
export function useIsAdmin(): boolean {
  return useAdminState().isAdmin;
}

export interface AdminOnlyProps {
  /**
   * Ataylab majburiy: `isAdmin` ixtiyoriy bo'lsa, uni uzatishni unutgan
   * chaqiruvchi jimgina "admin emas" holatiga tushib qolardi va yo'qolgan
   * tugmani hech kim sezmasdi. Server prop'i yo'q bo'lsa — `useIsAdmin()`.
   */
  isAdmin: boolean;
  children: React.ReactNode;
  /** Admin bo'lmaganda o'rniga chiziladigan narsa (odatda hech nima). */
  fallback?: React.ReactNode;
}

/** Faqat admin uchun mo'ljallangan boshqaruvlarni o'raydi. */
export function AdminOnly({ isAdmin, children, fallback = null }: AdminOnlyProps) {
  return <>{isAdmin ? children : fallback}</>;
}
