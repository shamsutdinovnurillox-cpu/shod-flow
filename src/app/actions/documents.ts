"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-guard";
import { toUserMessage, requireField, ValidationError } from "@/lib/errors";
import { saveDocument } from "@/lib/storage";

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
    const fileUrl = await saveDocument(file);

    const document = await prisma.document.create({
      data: {
        entityType,
        entityId,
        type,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileUrl,
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
