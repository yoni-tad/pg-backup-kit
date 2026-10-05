import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateChecksum } from "../../src/backup/checksum.js";

describe("checksum", () => {
  it("returns a SHA-256 checksum", async () => {
    const directory = await mkdtemp(join(tmpdir(), "db-backup-test-"));

    const filePath = join(directory, "test.txt");

    try {
      await writeFile(filePath, "hello world");

      const checksum = await calculateChecksum(filePath);

      expect(checksum).toBe(
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
