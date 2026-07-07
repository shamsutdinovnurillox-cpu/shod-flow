import "server-only";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { uploadFile, getFileUrl } from "./s3";
import { ValidationError } from "./errors";

// ============================================================================
// Fayl saqlash abstraksiyasi.
//   - S3_BUCKET env bo'lsa: AWS S3 (yoki S3-mos R2) + signed URL.
//   - Aks holda: lokal disk (.uploads/) — dev/local uchun, tashqi xizmatsiz.
// Ikkala holatda ham `fileUrl` qaytadi (DB'da saqlanadi, UI'da havola sifatida).
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

export async function saveDocument(file: File): Promise<string> {
  if (!file || file.size === 0) throw new ValidationError("Fayl tanlanmagan.");
  if (file.size > MAX_SIZE) throw new ValidationError("Fayl hajmi 10MB dan oshmasligi kerak.");
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError("Faqat PDF, PNG, JPG yoki WEBP fayllarga ruxsat.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const contentType = file.type || "application/octet-stream";

  // S3 rejimi
  if (process.env.S3_BUCKET) {
    const key = `documents/${id}-${file.name}`;
    await uploadFile(process.env.S3_BUCKET, key, buffer, contentType);
    return await getFileUrl(process.env.S3_BUCKET, key);
  }

  // Lokal disk rejimi
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, id), buffer);
  await fs.writeFile(
    path.join(UPLOAD_DIR, `${id}.meta.json`),
    JSON.stringify({ name: file.name, type: contentType, size: file.size }),
  );
  return `/api/files/${id}`;
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
