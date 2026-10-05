import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BackupService } from "../../src/backup/service.js";
import { RestoreService } from "../../src/restore/service.js";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);

const enabled = process.env.RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!enabled)("remote restore", () => {
  it("restores a backup from Supabase", async () => {
    const sourceDatabase = process.env.TEST_SOURCE_DATABASE_URL;
    const restoreDatabase = process.env.TEST_DATABASE_URL;
    const endpoint = process.env.SUPABASE_S3_ENDPOINT;
    const region = process.env.SUPABASE_S3_REGION;
    const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
    const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
    const bucket = process.env.SUPABASE_S3_BUCKET;

    if (
      !sourceDatabase ||
      !restoreDatabase ||
      !endpoint ||
      !region ||
      !accessKey ||
      !secretKey ||
      !bucket
    ) {
      throw new Error("Integration environment is incomplete");
    }

    const marker = `remote-restore-${Date.now()}`;

    const directory = await mkdtemp(join(tmpdir(), "db-backup-restore-"));

    try {
      await execFileAsync("psql", [
        sourceDatabase,
        "-c",
        `
              CREATE TABLE IF NOT EXISTS remote_restore_test (
                id SERIAL PRIMARY KEY,
                value TEXT NOT NULL
              );

              INSERT INTO remote_restore_test (value)
              VALUES ('${marker}');
            `,
      ]);

      const backupService = new BackupService({
        databaseUrl: sourceDatabase,
        backupDirectory: join(directory, "backups"),
        temporaryDirectory: join(directory, "tmp"),
        retentionCount: 7,
        storage: "supabase",
        supabaseS3Endpoint: endpoint,
        supabaseS3Region: region,
        supabaseS3AccessKey: accessKey,
        supabaseS3SecretKey: secretKey,
        supabaseS3Bucket: bucket,
      });

      const backup = await backupService.run();

      const restoreService = new RestoreService({
        databaseUrl: restoreDatabase,
        temporaryDirectory: join(directory, "restore"),
        storage: "supabase",
        supabaseS3Endpoint: endpoint,
        supabaseS3Region: region,
        supabaseS3AccessKey: accessKey,
        supabaseS3SecretKey: secretKey,
        supabaseS3Bucket: bucket,
      });

      await restoreService.restoreRemote(backup.artifact.filePath);

      const result = await execFileAsync("psql", [
        restoreDatabase,
        "-t",
        "-A",
        "-c",
        `
                SELECT value
                FROM remote_restore_test
                WHERE value = '${marker}';
              `,
      ]);

      expect(result.stdout.trim()).toBe(marker);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
