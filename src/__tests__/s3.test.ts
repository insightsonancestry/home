import { describe, it, expect, vi } from "vitest";

// Mock AWS SDK before importing s3 module
vi.mock("@aws-sdk/client-s3", () => {
  const S3Client = vi.fn().mockImplementation(function() {
    return {};
  });
  // Mark it as a constructor
  Object.defineProperty(S3Client, Symbol.hasInstance, { value: () => true });
  return {
    S3Client,
    PutObjectCommand: vi.fn().mockImplementation(function(params: unknown) { return params; }),
    DeleteObjectCommand: vi.fn().mockImplementation(function(params: unknown) { return params; }),
    HeadObjectCommand: vi.fn().mockImplementation(function(params: unknown) { return params; }),
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://mock-presigned-url.s3.amazonaws.com/test"),
}));

// Set env before import
process.env.S3_BUCKET_NAME = "test-bucket";
process.env.AWS_REGION = "us-east-1";

describe("S3 key validation", () => {
  it("validates UUID format for userId", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/s3");
    await expect(
      createPresignedUploadUrl("f458f448-40f1-70bb-9a76-84fbe923f569", "test.txt", 1000),
    ).resolves.toBeDefined();
  });

  it("rejects non-UUID userId", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/s3");

    await expect(
      createPresignedUploadUrl("../../admin", "test.txt", 1000),
    ).rejects.toThrow("Invalid userId");

    await expect(
      createPresignedUploadUrl("not-a-uuid", "test.txt", 1000),
    ).rejects.toThrow("Invalid userId");

    await expect(
      createPresignedUploadUrl("", "test.txt", 1000),
    ).rejects.toThrow("Invalid userId");
  });

  it("rejects filenames with path traversal", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/s3");
    const uid = "f458f448-40f1-70bb-9a76-84fbe923f569";

    await expect(
      createPresignedUploadUrl(uid, "../../../etc/passwd", 1000),
    ).rejects.toThrow("Invalid fileName");

    await expect(
      createPresignedUploadUrl(uid, "file/with/slashes.txt", 1000),
    ).rejects.toThrow("Invalid fileName");
  });

  it("rejects filenames with special characters", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/s3");
    const uid = "f458f448-40f1-70bb-9a76-84fbe923f569";

    await expect(
      createPresignedUploadUrl(uid, "file with spaces.txt", 1000),
    ).rejects.toThrow("Invalid fileName");

    await expect(
      createPresignedUploadUrl(uid, "file<script>.txt", 1000),
    ).rejects.toThrow("Invalid fileName");
  });

  it("rejects files exceeding 50MB", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/s3");
    const uid = "f458f448-40f1-70bb-9a76-84fbe923f569";

    await expect(
      createPresignedUploadUrl(uid, "test.txt", 60 * 1024 * 1024),
    ).rejects.toThrow("File too large");
  });

  it("accepts valid filenames", async () => {
    const { createPresignedUploadUrl } = await import("@/lib/s3");
    const uid = "f458f448-40f1-70bb-9a76-84fbe923f569";

    const result = await createPresignedUploadUrl(uid, "abcdef01_1.txt", 5000);
    expect(result.s3Key).toBe(`${uid}/rawfiles/abcdef01_1.txt`);
    expect(result.url).toBeDefined();
  });
});
