"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const s3_js_1 = require("../../src/storage/s3.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
const endpoint = process.env.SUPABASE_S3_ENDPOINT;
const region = process.env.SUPABASE_S3_REGION;
const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
const bucket = process.env.SUPABASE_S3_BUCKET;
vitest_1.describe.skipIf(!enabled)("Supabase S3 storage", () => {
    (0, vitest_1.it)("uploads and downloads a file", async () => {
        if (!endpoint || !region || !accessKey || !secretKey || !bucket) {
            throw new Error("Supabase S3 configuration is required");
        }
        const directory = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "db-backup-s3-"));
        const sourcePath = (0, node_path_1.join)(directory, "source.txt");
        const downloadedPath = (0, node_path_1.join)(directory, "downloaded.txt");
        const key = `tests/storage-${Date.now()}.txt`;
        const content = "Supabase storage integration test";
        const storage = new s3_js_1.SupabaseStorage({
            endpoint,
            region,
            accessKey,
            secretKey,
            bucket,
        });
        const client = new client_s3_1.S3Client({
            endpoint,
            region,
            forcePathStyle: true,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
        });
        try {
            await (0, promises_1.writeFile)(sourcePath, content);
            await storage.save(sourcePath, key);
            await storage.download(key, downloadedPath);
            const result = await (0, promises_1.readFile)(downloadedPath, "utf8");
            (0, vitest_1.expect)(result).toBe(content);
        }
        finally {
            await client
                .send(new client_s3_1.DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            }))
                .catch(() => { });
            await (0, promises_1.rm)(directory, {
                recursive: true,
                force: true,
            });
        }
    });
});
