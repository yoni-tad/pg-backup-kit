import dotenv from "dotenv";
import { mkdir } from "fs/promises";
import { join, resolve } from "path";
import { BackupService } from "./backup/service";
import { loadConfig } from "./config";
import { RestoreService } from "./restore/service";
import { error, info, success } from "./logger";
dotenv.config();

const config = loadConfig();
const command = process.argv[2];

const backupDirectory = resolve(config.backupDirectory);
const temporaryDirectory = resolve(config.temporaryDirectory);

const backupService = new BackupService({
  databaseUrl: config.databaseUrl,
  backupDirectory,
  temporaryDirectory,
  verificationDatabaseUrl: config.verificationDatabaseUrl,
  retentionCount: config.retentionCount,
  storage: config.storage,
  supabaseS3Endpoint: config.supabaseS3Endpoint,
  supabaseS3Region: config.supabaseS3Region,
  supabaseS3AccessKey: config.supabaseS3AccessKey,
  supabaseS3SecretKey: config.supabaseS3SecretKey,
  supabaseS3Bucket: config.supabaseS3Bucket,
});

const restoreService = new RestoreService({
  databaseUrl: config.databaseUrl,
  temporaryDirectory,
  storage: config.storage,
  supabaseS3Endpoint: config.supabaseS3Endpoint,
  supabaseS3Region: config.supabaseS3Region,
  supabaseS3AccessKey: config.supabaseS3AccessKey,
  supabaseS3SecretKey: config.supabaseS3SecretKey,
  supabaseS3Bucket: config.supabaseS3Bucket,
});

async function main() {
  await mkdir(backupDirectory, { recursive: true });
  await mkdir(temporaryDirectory, { recursive: true });

  try {
    if (command === "backup") {
      info("Starting database backup...");

      const result = await backupService.run();
      success("Backup completed successfully");

      console.log("");
      console.log(result.artifact);

      process.exit(0);
    }

    if (command === "restore") {
      const backupKey = process.argv[3];

      if (!backupKey) {
        throw new Error(
          "Backup key is required.\n\n" +
            "Example:\n" +
            "npm run restore -- backup-2026.dump.gz",
        );
      }

      info("Starting remote database restore...");
      await restoreService.restoreRemote(backupKey);
      success("Remote restore completed successfully");
      process.exit(0);
    }

    console.log(`
Database Backup Tool

Commands:

  backup
    Create a new database backup

  restore <backup>
    Restore a remote backup

Examples:

  npm run backup

  npm run restore -- backup-2026-10-05.dump.gz
`);

    process.exit(0);
  } catch (err) {
    info("An error occurred:");
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Error occurred during backup:", error);
  process.exit(1);
});
