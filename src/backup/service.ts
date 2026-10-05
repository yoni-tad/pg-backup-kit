import { basename, join } from "node:path";
import { BackupArtifact } from "./artifact";
import { BackupJob, createBackupJob } from "./job";
import { createPostgresBackup } from "../database/postgres";
import { compressFile } from "./compression";
import { calculateChecksum } from "./checksum";
import { LocalStorage } from "../storage/local";
import { mkdir, stat } from "node:fs/promises";
import { verifyBackup } from "./verification";
import { randomUUID } from "node:crypto";
import { applyRetention } from "./retention";
import { SupabaseStorage } from "../storage/s3";
import { unlink } from "node:fs/promises";
import { applyS3Retention } from "../storage/s3-retention";

export interface BackupServiceOptions {
  databaseUrl: string;
  backupDirectory: string;
  temporaryDirectory: string;
  verificationDatabaseUrl?: string;
  retentionCount: number;

  storage: "local" | "supabase";

  supabaseS3Endpoint?: string;
  supabaseS3Region?: string;
  supabaseS3AccessKey?: string;
  supabaseS3SecretKey?: string;
  supabaseS3Bucket?: string;
}

export interface BackupResult {
  job: BackupJob;
  artifact: BackupArtifact;
}

export class BackupService {
  private readonly databaseUrl: string;
  private readonly backupDirectory: string;
  private readonly temporaryDirectory: string;
  private readonly verificationDatabaseUrl?: string;
  private readonly retentionCount: number;
  private readonly storage: "local" | "supabase";
  private readonly supabaseS3Endpoint?: string;
  private readonly supabaseS3Region?: string;
  private readonly supabaseS3AccessKey?: string;
  private readonly supabaseS3SecretKey?: string;
  private readonly supabaseS3Bucket?: string;

  constructor(options: BackupServiceOptions) {
    this.databaseUrl = options.databaseUrl;
    this.backupDirectory = options.backupDirectory;
    this.temporaryDirectory = options.temporaryDirectory;
    this.verificationDatabaseUrl = options.verificationDatabaseUrl;
    this.retentionCount = options.retentionCount;
    this.storage = options.storage;
    this.supabaseS3Endpoint = options.supabaseS3Endpoint;
    this.supabaseS3Region = options.supabaseS3Region;
    this.supabaseS3AccessKey = options.supabaseS3AccessKey;
    this.supabaseS3SecretKey = options.supabaseS3SecretKey;
    this.supabaseS3Bucket = options.supabaseS3Bucket;
  }

  async run(): Promise<BackupResult> {
    const job = createBackupJob();
    job.status = "running";
    job.startedAt = new Date();

    try {
      await mkdir(this.backupDirectory, {
        recursive: true,
      });
      await mkdir(this.temporaryDirectory, {
        recursive: true,
      });

      const timeStamp = new Date().toISOString().replace(/[:.]/g, "-");
      const dumpFile = join(this.temporaryDirectory, `backup-${timeStamp}.tar`);
      const compressedFile = `${dumpFile}.gz`;

      // Create dump
      await createPostgresBackup({
        databaseUrl: this.databaseUrl,
        outputFile: dumpFile,
      });

      // Compress
      await compressFile({
        inputPath: dumpFile,
        outputPath: compressedFile,
      });

      // checksum
      const checksum = await calculateChecksum(compressedFile);

      //   verify
      let verified = false;
      if (this.verificationDatabaseUrl) {
        const verificationFile = join(
          this.temporaryDirectory,
          `${basename(compressedFile, ".gz")}-verify.dump`,
        );
        await verifyBackup({
          backupPath: compressedFile,
          temporaryDatabaseUrl: this.verificationDatabaseUrl,
          decompressedPath: verificationFile,
        });
        verified = true;
      }

      // Storage
      const backupName = basename(compressedFile);
      const fileStats = await stat(compressedFile);
      let storage;
      let finalPath: string;

      if (this.storage === "supabase") {
        if (
          !this.supabaseS3Endpoint ||
          !this.supabaseS3Region ||
          !this.supabaseS3AccessKey ||
          !this.supabaseS3SecretKey ||
          !this.supabaseS3Bucket
        ) {
          throw new Error("Supabase S3 configuration is incomplete");
        }
        storage = new SupabaseStorage({
          endpoint: this.supabaseS3Endpoint,
          region: this.supabaseS3Region,
          accessKey: this.supabaseS3AccessKey,
          secretKey: this.supabaseS3SecretKey,
          bucket: this.supabaseS3Bucket,
        });
        finalPath = backupName;

        console.log(compressedFile, finalPath);
        await storage.save(compressedFile, finalPath);
        await unlink(compressedFile).catch(() => {});

        const deletedBackups = await applyS3Retention({
          endpoint: this.supabaseS3Endpoint,
          region: this.supabaseS3Region,
          accessKey: this.supabaseS3AccessKey,
          secretKey: this.supabaseS3SecretKey,
          bucket: this.supabaseS3Bucket,
          keep: this.retentionCount,
        });

        for (const backup of deletedBackups) {
          console.log(`Deleted old remote backup: ${backup}`);
        }
      } else {
        storage = new LocalStorage();
        finalPath = join(this.backupDirectory, backupName);
        await storage.save(compressedFile, finalPath);

        const deletedBackups = await applyRetention({
          directory: this.backupDirectory,
          keep: this.retentionCount,
        });
        for (const backup of deletedBackups) {
          console.log(`Deleted old backup: ${backup}`);
        }
      }

      const artifact: BackupArtifact = {
        id: randomUUID(),
        jobId: job.id,
        database: new URL(this.databaseUrl).pathname.slice(1),
        filePath: finalPath,
        createdAt: new Date(),
        sizeBytes: fileStats.size,
        checksum,
        verified,
      };

      job.status = "completed";
      job.completedAt = new Date();

      return { job, artifact };
    } catch (error) {
      job.status = "failed";
      job.completedAt = new Date();

      job.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
}
