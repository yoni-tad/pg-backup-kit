"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const postgres_js_1 = require("../../src/database/postgres.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const sourceDatabase = process.env.TEST_SOURCE_DATABASE_URL;
const restoreDatabase = process.env.TEST_DATABASE_URL;
const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
vitest_1.describe.skipIf(!enabled)("PostgreSQL backup and restore", () => {
    (0, vitest_1.it)("creates a backup and restores it", async () => {
        if (!sourceDatabase || !restoreDatabase) {
            throw new Error("TEST_SOURCE_DATABASE_URL and TEST_DATABASE_URL are required");
        }
        const directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "db-backup-postgres-"));
        const backupPath = (0, node_path_1.join)(directory, "postgres.dump");
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
            await (0, postgres_js_1.createPostgresBackup)({
                databaseUrl: sourceDatabase,
                outputFile: backupPath,
            });
            const backupStats = await (0, promises_1.stat)(backupPath);
            (0, vitest_1.expect)(backupStats.size).toBeGreaterThan(0);
            await (0, postgres_js_1.restorePostgresBackup)({
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
            (0, vitest_1.expect)(result.stdout.trim()).toBe(marker);
        }
        finally {
            await (0, promises_1.rm)(directory, {
                recursive: true,
                force: true,
            });
        }
    });
}, 30_000);
