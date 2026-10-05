import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

export interface RetentionOptions {
  directory: string;
  keep: number;
}

export async function applyRetention({
  directory,
  keep,
}: RetentionOptions): Promise<string[]> {
  if (keep < 1) {
    throw new Error("Keep must be at least 1");
  }

  const entries = await readdir(directory);
  const backups = [];

  for (const entry of entries) {
    if (!entry.endsWith(".tar.gz")) {
      continue;
    }

    const filePath = join(directory, entry);
    const fileStats = await stat(filePath);
    backups.push({ filePath, modifiedTime: fileStats.mtime.getTime() });
  }

  backups.sort((a, b) => b.modifiedTime - a.modifiedTime);
  const backupsToDelete = backups.slice(keep);

  for (const backup of backupsToDelete) {
    await unlink(backup.filePath).catch(() => {});
  }

  return backupsToDelete.map((b) => b.filePath);
}
