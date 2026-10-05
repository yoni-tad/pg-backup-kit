import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPostgresBackup,
  restorePostgresBackup,
} from "../../src/database/postgres.js";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);
const sourceDatabase = process.env.TEST_SOURCE_DATABASE_URL;
const restoreDatabase = process.env.TEST_DATABASE_URL;
const enabled = process.env.RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!enabled)("PostgreSQL backup and restore", () => {
  it("creates a backup and restores it", async () => {
    if (!sourceDatabase || !restoreDatabase) {
      throw new Error(
        "TEST_SOURCE_DATABASE_URL and TEST_DATABASE_URL are required",
      );
    }

    const directory = await mkdtemp(join(tmpdir(), "db-backup-postgres-"));

    const backupPath = join(directory, "postgres.dump");

    const marker = `backup-test-${Date.now()}`;

    try {
      await execFileAsync("psql", [
        sourceDatabase,
        "-c",
        `
              CREATE TABLE IF NOT EXISTS backup_test_marker (
                id SERIAL PRIMARY KEY,
                value TEXT NOT NULL
              );

              INSERT INTO backup_test_marker (value)
              VALUES ('${marker}');
            `,
      ]);

      await createPostgresBackup({
        databaseUrl: sourceDatabase,
        outputFile: backupPath,
      });

      const backupStats = await stat(backupPath);

      expect(backupStats.size).toBeGreaterThan(0);

      await restorePostgresBackup({
        databaseUrl: restoreDatabase,
        backupPath,
      });

      const result = await execFileAsync("psql", [
        restoreDatabase,
        "-t",
        "-A",
        "-c",
        `
                SELECT value
                FROM backup_test_marker
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
}, 30_000);
