"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

// (app) segmenti uchun xato chegarasi — server xatolarida oq ekran o'rniga
// tushunarli xabar va qayta urinish tugmasi.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="p-3 rounded-xl bg-red-100 text-red-600">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-fg">Xatolik yuz berdi</h1>
      <p className="max-w-md text-sm text-muted break-words">
        {error.message || "Kutilmagan xatolik. Qaytadan urinib ko'ring."}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 btn btn-primary"
      >
        <RotateCw className="h-4 w-4" /> Qayta urinish
      </button>
    </div>
  );
}
