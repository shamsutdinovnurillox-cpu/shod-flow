"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { saveDocument, deleteStoredFile } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

export async function getDocuments() {
  await requireUser();
  return prisma.document.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createDocument(formData: FormData) {
  const user = await requireUser();
  try {
    const entityType = String(formData.get("entityType") ?? "").trim();
    const entityId = String(formData.get("entityId") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const issueDate = String(formData.get("issueDate") ?? "");
    const expiryDate = String(formData.get("expiryDate") ?? "");
    const file = formData.get("file");

    requireField(entityType, "Entity turi");
    requireField(entityId, "Entity ID");
    requireField(type, "Hujjat turi");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Fayl tanlanmagan.");
    }

    // Real yuklash (lokal disk yoki S3).
    const saved = await saveDocument(file);

    // fileUrl doim /api/files/{docId} — route har so'rovda auth tekshiradi va
    // S3 uchun yangi presigned URL beradi (saqlangan URL eskirib qolmaydi).
    const docId = randomUUID();
    const document = await prisma.document.create({
      data: {
        id: docId,
        entityType,
        entityId,
        type,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileUrl: `/api/files/${docId}`,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        uploadedBy: user.id,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "UPLOAD", entityType: "Document", entityId: document.id },
    });

    revalidatePath("/fleet/documents");
    revalidatePath("/safety/documents");
    return document;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/**
 * Hujjatni yangi fayl bilan almashtiradi (PRD 3: replacement/version history).
 * Eski yozuv o'chmaydi — yangi hujjat `replacesId` orqali zanjirga bog'lanadi.
 */
export async function replaceDocument(oldId: string, formData: FormData) {
  const user = await requireUser();
  try {
    const old = await prisma.document.findUnique({ where: { id: oldId } });
    if (!old) throw new ValidationError("Almashtiriladigan hujjat topilmadi.");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Fayl tanlanmagan.");
    }
    const issueDate = String(formData.get("issueDate") ?? "");
    const expiryDate = String(formData.get("expiryDate") ?? "");

    const saved = await saveDocument(file);
    const docId = randomUUID();
    const document = await prisma.document.create({
      data: {
        id: docId,
        entityType: old.entityType,
        entityId: old.entityId,
        type: old.type,
        issueDate: issueDate ? new Date(issueDate) : old.issueDate,
        expiryDate: expiryDate ? new Date(expiryDate) : old.expiryDate,
        fileUrl: `/api/files/${docId}`,
        storageKey: saved.storageKey,
        fileName: saved.fileName,
        replacesId: old.id,
        uploadedBy: user.id,
      },
    });

    await writeAudit(prisma, {
      userId: user.id, action: "UPLOAD", entityType: "Document", entityId: document.id,
      details: { replaces: old.id, type: old.type, fileName: saved.fileName },
    });

    revalidatePath("/fleet/documents");
    revalidatePath("/safety/documents");
    return document;
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}

/** Hujjatni o'chiradi — saqlangan fayl bilan birga. Audit yoziladi. */
export async function deleteDocument(id: string) {
  const user = await requireUser();
  try {
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) throw new ValidationError("Hujjat topilmadi.");

    await prisma.document.delete({ where: { id } });
    // Fayl o'chmasa ham DB yozuvi o'chgan — best-effort tozalash.
    try {
      await deleteStoredFile(existing.storageKey);
    } catch (err) {
      console.error("Faylni o'chirishda xato:", err);
    }

    await writeAudit(prisma, {
      userId: user.id, action: "DELETE", entityType: "Document", entityId: id,
      details: { type: existing.type, fileName: existing.fileName, entityType: existing.entityType, entityId: existing.entityId },
    });

    revalidatePath("/fleet/documents");
    revalidatePath("/safety/documents");
  } catch (e) {
    throw new Error(toUserMessage(e));
  }
}
