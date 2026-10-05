import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { applyS3Retention } from "../../src/storage/s3-retention.js";
import dotenv from "dotenv";

dotenv.config();

const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
const endpoint = process.env.SUPABASE_S3_ENDPOINT;
const region = process.env.SUPABASE_S3_REGION;
const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
const bucket = process.env.SUPABASE_S3_BUCKET;

describe.skipIf(!enabled)("Supabase remote retention", () => {
  it("keeps only the newest backups", async () => {
    if (!endpoint || !region || !accessKey || !secretKey || !bucket) {
      throw new Error("Supabase S3 configuration is required");
    }

    const client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });

    const prefix = `tests/retention-${Date.now()}`;

    const keys = [
      `${prefix}-1.tar.gz`,
      `${prefix}-2.tar.gz`,
      `${prefix}-3.tar.gz`,
    ];

    try {
      for (const key of keys) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: "test backup",
          }),
        );
      }

      const deleted = await applyS3Retention({
        endpoint,
        region,
        accessKey,
        secretKey,
        bucket,
        keep: 2,
      });

      expect(deleted.length).toBeGreaterThanOrEqual(1);
    } finally {
      for (const key of keys) {
        await client
          .send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: key,
            }),
          )
          .catch(() => {});
      }
    }
  });
});
