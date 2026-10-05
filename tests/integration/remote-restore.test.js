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
const service_js_1 = require("../../src/backup/service.js");
const service_js_2 = require("../../src/restore/service.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
vitest_1.describe.skipIf(!enabled)("remote restore", () => {
    (0, vitest_1.it)("restores a backup from Supabase", async () => {
        const sourceDatabase = process.env.TEST_SOURCE_DATABASE_URL;
        const restoreDatabase = process.env.TEST_DATABASE_URL;
        const endpoint = process.env.SUPABASE_S3_ENDPOINT;
        const region = process.env.SUPABASE_S3_REGION;
        const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
        const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
        const bucket = process.env.SUPABASE_S3_BUCKET;
        if (!sourceDatabase ||
            !restoreDatabase ||
            !endpoint ||
            !region ||
            !accessKey ||
            !secretKey ||
            !bucket) {
            throw new Error("Integration environment is incomplete");
        }
        const marker = `remote-restore-${Date.now()}`;
        const directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "db-backup-restore-"));
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
            const backupService = new service_js_1.BackupService({
                databaseUrl: sourceDatabase,
                backupDirectory: (0, node_path_1.join)(directory, "backups"),
                temporaryDirectory: (0, node_path_1.join)(directory, "tmp"),
                retentionCount: 7,
                storage: "supabase",
                supabaseS3Endpoint: endpoint,
                supabaseS3Region: region,
                supabaseS3AccessKey: accessKey,
                supabaseS3SecretKey: secretKey,
                supabaseS3Bucket: bucket,
            });
            const backup = await backupService.run();
            const restoreService = new service_js_2.RestoreService({
                databaseUrl: restoreDatabase,
                temporaryDirectory: (0, node_path_1.join)(directory, "restore"),
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
            (0, vitest_1.expect)(result.stdout.trim()).toBe(marker);
        }
        finally {
            await (0, promises_1.rm)(directory, {
                recursive: true,
                force: true,
            });
        }
    });
});
