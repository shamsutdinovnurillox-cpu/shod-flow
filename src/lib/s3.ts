import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { contentDisposition } from "@/lib/storage";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  // endpoint: process.env.S3_ENDPOINT, // MinIO yoki R2 uchun
});

export const uploadFile = async (
  bucket: string,
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string
) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  return await s3Client.send(command);
};

/**
 * Faylga vaqtinchalik havola.
 *
 * `filename` berilsa, S3 javob sarlavhasini `attachment` qilib qaytaradi —
 * ya'ni brauzer faylni ochish o'rniga yuklab oladi. Busiz butun ilovada
 * hujjatni yuklab olishning iloji yo'q edi.
 */
export const getFileUrl = async (
  bucket: string,
  key: string,
  expiresIn = 3600,
  filename?: string,
) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(filename ? { ResponseContentDisposition: contentDisposition(filename, true) } : {}),
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const deleteFile = async (bucket: string, key: string) => {
  return await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};
