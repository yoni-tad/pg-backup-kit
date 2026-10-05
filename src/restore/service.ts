import { resolve } from "node:path";
import { restoreRemoteBackup } from "../backup/remote-restore";
import { restorePostgresBackup } from "../database/postgres";
import { info, success } from "../logger";

interface RestoreServiceOptions {
  databaseUrl: string;

  temporaryDirectory: string;

  storage: "local" | "supabase";

  supabaseS3Endpoint?: string;
  supabaseS3Region?: string;
  supabaseS3AccessKey?: string;
  supabaseS3SecretKey?: string;
  supabaseS3Bucket?: string;
}

export class RestoreService {
  private readonly databaseUrl: string;
  private readonly temporaryDirectory: string;

  private readonly storage: "local" | "supabase";

  private readonly supabaseS3Endpoint?: string;
  private readonly supabaseS3Region?: string;
  private readonly supabaseS3AccessKey?: string;
  private readonly supabaseS3SecretKey?: string;
  private readonly supabaseS3Bucket?: string;

  constructor({
    databaseUrl,
    temporaryDirectory,
    storage,
    supabaseS3Endpoint,
    supabaseS3Region,
    supabaseS3AccessKey,
    supabaseS3SecretKey,
    supabaseS3Bucket,
  }: RestoreServiceOptions) {
    this.databaseUrl = databaseUrl;
    this.temporaryDirectory = temporaryDirectory;
    this.storage = storage;
    this.supabaseS3Endpoint = supabaseS3Endpoint;
    this.supabaseS3Region = supabaseS3Region;
    this.supabaseS3AccessKey = supabaseS3AccessKey;
    this.supabaseS3SecretKey = supabaseS3SecretKey;
    this.supabaseS3Bucket = supabaseS3Bucket;
  }

  async restoreLocal(backupPath: string): Promise<void> {
    info(`Restoring local backup: ${backupPath}`);
    await restorePostgresBackup({
      databaseUrl: this.databaseUrl,
      backupPath,
    });
    success("Local database restore completed");
  }

  async restoreRemote(backupKey: string): Promise<void> {
    if (this.storage !== "supabase") {
      throw new Error("Remote restore requires Supabase storage");
    }

    if (
      !this.supabaseS3Endpoint ||
      !this.supabaseS3Region ||
      !this.supabaseS3AccessKey ||
      !this.supabaseS3SecretKey ||
      !this.supabaseS3Bucket
    ) {
      throw new Error("Supabase S3 configuration is incomplete");
    }

    const compressedPath = resolve(this.temporaryDirectory, "restore.dump.gz");
    const dumpPath = resolve(this.temporaryDirectory, "restore.dump");

    await restoreRemoteBackup({
      endpoint: this.supabaseS3Endpoint,
      region: this.supabaseS3Region,
      accessKey: this.supabaseS3AccessKey,
      secretKey: this.supabaseS3SecretKey,
      bucket: this.supabaseS3Bucket,
      backupKey,
      temporaryCompressedPath: compressedPath,
      temporaryDumpPath: dumpPath,
      databaseUrl: this.databaseUrl,
    });
  }
}
