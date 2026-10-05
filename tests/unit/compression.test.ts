import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compressFile, decompressFile } from "../../src/backup/compression.js";

describe("compression", () => {
  it("compresses and decompresses a file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "db-backup-test-"));
    const originalPath = join(directory, "original.txt");
    const compressedPath = join(directory, "original.txt.gz");
    const decompressedPath = join(directory, "decompressed.txt");
    const content = "Database backup test content";

    try {
      await writeFile(originalPath, content);
      await compressFile({
        inputPath: originalPath,
        outputPath: compressedPath,
      });
      await decompressFile({
        inputPath: compressedPath,
        outputPath: decompressedPath,
      });
      const result = await readFile(decompressedPath, "utf8");
      expect(result).toBe(content);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
