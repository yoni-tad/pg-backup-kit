import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyRetention } from "../../src/backup/retention.js";

describe("local retention", () => {
    it("keeps only the newest backups", async () => {
        const directory = await mkdtemp(join(tmpdir(), "db-backup-test-"));
        try {
            const files = [
                "backup-1.tar.gz",
                "backup-2.tar.gz",
                "backup-3.tar.gz",
                "backup-4.tar.gz",
                "backup-5.tar.gz",
            ];
            for (let index = 0; index < files.length; index++) {
                const filePath = join(directory, files[index]);
                await writeFile(filePath, `backup ${index}`);
                const time = new Date(2026, 0, 1, 0, 0, index);
                await utimes(filePath, time, time);
            }
            const deleted = await applyRetention({
                directory,
                keep: 2,
            });
            expect(deleted).toHaveLength(3);
            const remaining = await readdir(directory);
            expect(remaining).toEqual(["backup-4.tar.gz", "backup-5.tar.gz"]);
        }
        finally {
            await rm(directory, {
                recursive: true,
                force: true,
            });
        }
    });

    it("rejects invalid retention values", async () => {
        await expect(applyRetention({
            directory: "/tmp",
            keep: 0,
        })).rejects.toThrow("Keep must be at least 1");
    });
});
