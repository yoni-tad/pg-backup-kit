import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BackupService } from "../../src/backup/service.js";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);

const enabled = process.env.RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!enabled)("full backup flow", () => {
  it("creates, verifies and stores a backup", async () => {
    const databaseUrl = process.env.TEST_SOURCE_DATABASE_URL;
    const verificationDatabaseUrl = process.env.TEST_DATABASE_URL;
    const endpoint = process.env.SUPABASE_S3_ENDPOINT;
    const region = process.env.SUPABASE_S3_REGION;
    const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
    const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
    const bucket = process.env.SUPABASE_S3_BUCKET;

    if (
      !databaseUrl ||
      !verificationDatabaseUrl ||
      !endpoint ||
      !region ||
      !accessKey ||
      !secretKey ||
      !bucket
    ) {
      throw new Error("Integration environment is incomplete");
    }

    const marker = `full-flow-${Date.now()}`;

    const directory = await mkdtemp(join(tmpdir(), "db-backup-flow-"));

    try {
      await execFileAsync("psql", [
        databaseUrl,
        "-c",
        `
              CREATE TABLE IF NOT EXISTS backup_flow_test (
                id SERIAL PRIMARY KEY,
                value TEXT NOT NULL
              );

              INSERT INTO backup_flow_test (value)
              VALUES ('${marker}');
            `,
      ]);

      const service = new BackupService({
        databaseUrl,
        backupDirectory: resolve(directory, "backups"),
        temporaryDirectory: resolve(directory, "tmp"),
        verificationDatabaseUrl,
        retentionCount: 7,
        storage: "supabase",
        supabaseS3Endpoint: endpoint,
        supabaseS3Region: region,
        supabaseS3AccessKey: accessKey,
        supabaseS3SecretKey: secretKey,
        supabaseS3Bucket: bucket,
      });

      const result = await service.run();

      expect(result.job.status).toBe("completed");
      expect(result.artifact.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(result.artifact.verified).toBe(true);
      expect(result.artifact.sizeBytes).toBeGreaterThan(0);
      expect(result.artifact.filePath).toMatch(/\.tar\.gz$/);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
