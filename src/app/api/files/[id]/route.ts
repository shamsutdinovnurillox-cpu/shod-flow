import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-guard";
import { readLocalFile } from "@/lib/storage";

// Auth bilan himoyalangan fayl yetkazish (lokal storage rejimi).
// Faqat tizimga kirgan foydalanuvchi ko'ra/yuklab oladi (PRD: signed access).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const file = await readLocalFile(id);
  if (!file) return new NextResponse("Not found", { status: 404 });

  // Uint8Array runtime'da to'g'ri BodyInit; Node/web tip chegarasi uchun cast.
  return new NextResponse(file.data as unknown as BodyInit, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
