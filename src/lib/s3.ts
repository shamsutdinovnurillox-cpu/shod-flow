import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export const getFileUrl = async (bucket: string, key: string, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};
