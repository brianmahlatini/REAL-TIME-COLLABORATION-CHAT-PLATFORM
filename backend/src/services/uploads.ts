import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env, s3Enabled } from "../config/env.js";

const s3 = s3Enabled
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!
      }
    })
  : undefined;

export async function storeUpload(file: Express.Multer.File) {
  const extension = path.extname(file.originalname);
  const key = `chat/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;

  if (s3 && env.S3_BUCKET) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      })
    );

    const baseUrl = env.S3_PUBLIC_BASE_URL || `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`;
    return {
      url: `${baseUrl}/${key}`,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  const uploadDir = path.resolve(process.cwd(), "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const localName = `${randomUUID()}${extension}`;
  await fs.writeFile(path.join(uploadDir, localName), file.buffer);

  return {
    url: `/uploads/${localName}`,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}
