import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SupabaseStorage } from "../../src/storage/s3.js";
import dotenv from "dotenv";

dotenv.config();

const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
const endpoint = process.env.SUPABASE_S3_ENDPOINT;
const region = process.env.SUPABASE_S3_REGION;
const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
const bucket = process.env.SUPABASE_S3_BUCKET;

describe.skipIf(!enabled)("Supabase S3 storage", () => {
  it("uploads and downloads a file", async () => {
    if (!endpoint || !region || !accessKey || !secretKey || !bucket) {
      throw new Error("Supabase S3 configuration is required");
    }

    const directory = await mkdtemp(join(tmpdir(), "db-backup-s3-"));

    const sourcePath = join(directory, "source.txt");

    const downloadedPath = join(directory, "downloaded.txt");

    const key = `tests/storage-${Date.now()}.txt`;

    const content = "Supabase storage integration test";

    const storage = new SupabaseStorage({
      endpoint,
      region,
      accessKey,
      secretKey,
      bucket,
    });

    const client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });

    try {
      await writeFile(sourcePath, content);

      await storage.save(sourcePath, key);

      await storage.download(key, downloadedPath);

      const result = await readFile(downloadedPath, "utf8");

      expect(result).toBe(content);
    } finally {
      await client
        .send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        )
        .catch(() => {});

      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
