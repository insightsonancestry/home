import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION || "us-east-1";

if (!BUCKET_NAME) {
  console.warn("S3_BUCKET_NAME not set, falling back to ioa-reference-data");
}

const bucket = BUCKET_NAME || "ioa-reference-data";

const s3Client = new S3Client({
  region: REGION,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

// UUID format: 8-4-4-4-12 hex with hyphens
const USER_ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// File names: alphanumeric, underscores, hyphens, dots only
const SAFE_FILENAME_RE = /^[a-zA-Z0-9_\-.]+$/;

function validateS3KeyParts(userId: string, fileName: string): void {
  if (!USER_ID_RE.test(userId)) {
    throw new Error("Invalid userId format for S3 key");
  }
  if (!SAFE_FILENAME_RE.test(fileName) || fileName.includes("..")) {
    throw new Error("Invalid fileName for S3 key");
  }
}

export async function createPresignedUploadUrl(
  userId: string,
  fileName: string,
): Promise<{ url: string; s3Key: string }> {
  validateS3KeyParts(userId, fileName);

  const s3Key = `${userId}/rawfiles/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: "text/plain",
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return { url, s3Key };
}

function validateUserKey(s3Key: string): void {
  if (!s3Key.includes("/rawfiles/") || s3Key.includes("..")) {
    throw new Error("Invalid S3 key: operation restricted to user rawfiles");
  }
}

export async function deleteObject(s3Key: string): Promise<void> {
  validateUserKey(s3Key);
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    }),
  );
}

export async function headObject(s3Key: string): Promise<{ contentLength: number } | null> {
  try {
    const res = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      }),
    );
    return { contentLength: res.ContentLength || 0 };
  } catch {
    return null;
  }
}
