import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guard";
import { readLocalFile } from "@/lib/storage";
import { getFileUrl } from "@/lib/s3";

// Auth bilan himoyalangan fayl yetkazish (PRD: signed access).
// id — Document.id: storageKey bo'yicha lokal fayl o'qiladi yoki S3 uchun
// har so'rovda yangi presigned URL'ga redirect qilinadi.
// Legacy havolalar (/api/files/{storageUuid}) uchun lokal disk fallback saqlangan.
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

  const doc = await prisma.document.findUnique({ where: { id } });
  if (doc?.storageKey) {
    if (doc.storageKey.startsWith("s3:")) {
      if (!process.env.S3_BUCKET) return new NextResponse("Storage unavailable", { status: 503 });
      const url = await getFileUrl(process.env.S3_BUCKET, doc.storageKey.slice(3), 300);
      return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (doc.storageKey.startsWith("local:")) {
      return serveLocal(doc.storageKey.slice(6));
    }
  }

  // Legacy: id lokal saqlash UUID'si bo'lgan eski fileUrl'lar.
  return serveLocal(id);
}

async function serveLocal(storageId: string) {
  const file = await readLocalFile(storageId);
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
