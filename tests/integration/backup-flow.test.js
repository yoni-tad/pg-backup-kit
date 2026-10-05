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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
vitest_1.describe.skipIf(!enabled)("full backup flow", () => {
    (0, vitest_1.it)("creates, verifies and stores a backup", async () => {
        const databaseUrl = process.env.TEST_SOURCE_DATABASE_URL;
        const verificationDatabaseUrl = process.env.TEST_DATABASE_URL;
        const endpoint = process.env.SUPABASE_S3_ENDPOINT;
        const region = process.env.SUPABASE_S3_REGION;
        const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
        const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
        const bucket = process.env.SUPABASE_S3_BUCKET;
        if (!databaseUrl ||
            !verificationDatabaseUrl ||
            !endpoint ||
            !region ||
            !accessKey ||
            !secretKey ||
            !bucket) {
            throw new Error("Integration environment is incomplete");
        }
        const marker = `full-flow-${Date.now()}`;
        const directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "db-backup-flow-"));
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
            const service = new service_js_1.BackupService({
                databaseUrl,
                backupDirectory: (0, node_path_1.resolve)(directory, "backups"),
                temporaryDirectory: (0, node_path_1.resolve)(directory, "tmp"),
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
            (0, vitest_1.expect)(result.job.status).toBe("completed");
            (0, vitest_1.expect)(result.artifact.checksum).toMatch(/^[a-f0-9]{64}$/);
            (0, vitest_1.expect)(result.artifact.verified).toBe(true);
            (0, vitest_1.expect)(result.artifact.sizeBytes).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.artifact.filePath).toMatch(/\.tar\.gz$/);
        }
        finally {
            await (0, promises_1.rm)(directory, {
                recursive: true,
                force: true,
            });
        }
    });
});
