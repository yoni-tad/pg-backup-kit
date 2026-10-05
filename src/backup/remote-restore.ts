import { unlink } from "node:fs/promises";
import { SupabaseStorage } from "../storage/s3";
import { decompressFile } from "./compression";
import { restorePostgresBackup } from "../database/postgres";
import { info, success } from "../logger";

interface RemoteRestoreOptions {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;

  backupKey: string;

  temporaryCompressedPath: string;
  temporaryDumpPath: string;

  databaseUrl: string;
}

export async function restoreRemoteBackup({
  endpoint,
  region,
  accessKey,
  secretKey,
  bucket,
  backupKey,
  temporaryCompressedPath,
  temporaryDumpPath,
  databaseUrl,
}: RemoteRestoreOptions): Promise<void> {
  const storage = new SupabaseStorage({
    endpoint,
    region,
    accessKey,
    secretKey,
    bucket,
  });

  try {
    info(`Downloading remote backup: ${backupKey}`);
    await storage.download(backupKey, temporaryCompressedPath);

    success("Download completed.");
    info("Decompressing backup...");

    await decompressFile({
      inputPath: temporaryCompressedPath,
      outputPath: temporaryDumpPath,
    });
    success("Decompression completed.");
    info("Restoring PostgreSQL database...");

    await restorePostgresBackup({
      databaseUrl,
      backupPath: temporaryDumpPath,
    });
    success("Database restored successfully.");
  } finally {
    await unlink(temporaryCompressedPath).catch(() => {});
    await unlink(temporaryDumpPath).catch(() => {});
  }
}
