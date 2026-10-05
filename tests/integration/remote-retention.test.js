"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const vitest_1 = require("vitest");
const s3_retention_js_1 = require("../../src/storage/s3-retention.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const enabled = process.env.RUN_INTEGRATION_TESTS === "true";
const endpoint = process.env.SUPABASE_S3_ENDPOINT;
const region = process.env.SUPABASE_S3_REGION;
const accessKey = process.env.SUPABASE_S3_ACCESS_KEY;
const secretKey = process.env.SUPABASE_S3_SECRET_KEY;
const bucket = process.env.SUPABASE_S3_BUCKET;
vitest_1.describe.skipIf(!enabled)("Supabase remote retention", () => {
    (0, vitest_1.it)("keeps only the newest backups", async () => {
        if (!endpoint || !region || !accessKey || !secretKey || !bucket) {
            throw new Error("Supabase S3 configuration is required");
        }
        const client = new client_s3_1.S3Client({
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
                await client.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: "test backup",
                }));
            }
            const deleted = await (0, s3_retention_js_1.applyS3Retention)({
                endpoint,
                region,
                accessKey,
                secretKey,
                bucket,
                keep: 2,
            });
            (0, vitest_1.expect)(deleted.length).toBeGreaterThanOrEqual(1);
        }
        finally {
            for (const key of keys) {
                await client
                    .send(new client_s3_1.DeleteObjectCommand({
                    Bucket: bucket,
                    Key: key,
                }))
                    .catch(() => { });
            }
        }
    });
});
