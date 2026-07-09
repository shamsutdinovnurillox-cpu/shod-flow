import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { uploadFile, deleteFile } from "./s3";
import { ValidationError } from "./errors";

// ============================================================================
// Fayl saqlash abstraksiyasi.
//   - S3_BUCKET env bo'lsa: AWS S3 (yoki S3-mos R2).
//   - Aks holda: lokal disk (.uploads/) — dev/local uchun, tashqi xizmatsiz.
// DB'ga barqaror `storageKey` ("s3:{key}" / "local:{uuid}") yoziladi; foydalanuvchi
// havolasi doim /api/files/{documentId} — S3 presigned URL har so'rovda yangidan
// imzolanadi (upload paytida imzolangan URL 1 soatda o'lib qolardi).
// ============================================================================

const UPLOAD_DIR = path.join(process.cwd(), ".uploads");
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export interface SavedDocument {
  storageKey: string; // "s3:{key}" yoki "local:{uuid}"
  fileName: string;
}

export async function saveDocument(file: File): Promise<SavedDocument> {
  if (!file || file.size === 0) throw new ValidationError("Fayl tanlanmagan.");
  if (file.size > MAX_SIZE) throw new ValidationError("Fayl hajmi 10MB dan oshmasligi kerak.");
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError("Faqat PDF, PNG, JPG yoki WEBP fayllarga ruxsat.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const contentType = file.type || "application/octet-stream";
  const fileName = file.name || id;

  // S3 rejimi
  if (process.env.S3_BUCKET) {
    // Kalitda faqat xavfsiz belgilar (S3 key metacharacter muammolarini oldini oladi).
    const safeName = fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
    const key = `documents/${id}-${safeName}`;
    await uploadFile(process.env.S3_BUCKET, key, buffer, contentType);
    return { storageKey: `s3:${key}`, fileName };
  }

  // Lokal disk rejimi
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, id), buffer);
  await fs.writeFile(
    path.join(UPLOAD_DIR, `${id}.meta.json`),
    JSON.stringify({ name: fileName, type: contentType, size: file.size }),
  );
  return { storageKey: `local:${id}`, fileName };
}

/** Saqlangan faylni o'chiradi (S3 yoki lokal). storageKey — "s3:{key}" / "local:{uuid}". */
export async function deleteStoredFile(storageKey: string | null | undefined): Promise<void> {
  if (!storageKey) return;
  if (storageKey.startsWith("s3:")) {
    if (process.env.S3_BUCKET) await deleteFile(process.env.S3_BUCKET, storageKey.slice(3));
    return;
  }
  if (storageKey.startsWith("local:")) {
    const id = storageKey.slice(6);
    if (!/^[a-f0-9-]{36}$/i.test(id)) return;
    await fs.rm(path.join(UPLOAD_DIR, id), { force: true });
    await fs.rm(path.join(UPLOAD_DIR, `${id}.meta.json`), { force: true });
  }
}

export interface StoredFile {
  data: Uint8Array;
  name: string;
  type: string;
}

/** Lokal saqlangan faylni o'qiydi (download route uchun). id — UUID. */
export async function readLocalFile(id: string): Promise<StoredFile | null> {
  // Path traversal himoyasi: faqat UUID formatiga ruxsat.
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, id));
    let meta = { name: id, type: "application/octet-stream" };
    try {
      meta = JSON.parse(await fs.readFile(path.join(UPLOAD_DIR, `${id}.meta.json`), "utf8"));
    } catch {
      // meta yo'q bo'lsa default
    }
    return { data: new Uint8Array(data), name: meta.name, type: meta.type };
  } catch {
    return null;
  }
}
