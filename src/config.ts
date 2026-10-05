export interface BackupConfig {
  databaseUrl: string;
  backupDirectory: string;
  temporaryDirectory: string;
  verificationDatabaseUrl?: string;
  retentionCount: number

  storage: "local" | "supabase";

  supabaseS3Endpoint?: string;
  supabaseS3Region?: string;
  supabaseS3AccessKey?: string;
  supabaseS3SecretKey?: string;
  supabaseS3Bucket?: string;
}

export function loadConfig(): BackupConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const storage = process.env.BACKUP_STORAGE ? "supabase" : "local";

  return {
    databaseUrl,
    backupDirectory: process.env.BACKUP_DIRECTORY || "backups",
    temporaryDirectory: process.env.TEMPORARY_DIRECTORY || "tmp",
    verificationDatabaseUrl: process.env.VERIFICATION_DATABASE_URL,
    retentionCount: Number(process.env.RETENTION_COUNT ?? "7"),

    storage,
    
    supabaseS3Endpoint: process.env.SUPABASE_S3_ENDPOINT,
    supabaseS3Region: process.env.SUPABASE_S3_REGION,
    supabaseS3AccessKey: process.env.SUPABASE_S3_ACCESS_KEY,
    supabaseS3SecretKey: process.env.SUPABASE_S3_SECRET_KEY,
    supabaseS3Bucket: process.env.SUPABASE_S3_BUCKET,
  };
}
