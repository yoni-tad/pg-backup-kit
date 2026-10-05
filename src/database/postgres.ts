import { execFile } from "node:child_process";
import { normalizePostgresUrl } from "./connection-url";


export interface PostgresBackupOptions {
  databaseUrl: string;
  outputFile: string;
}

export function createPostgresBackup(
  options: PostgresBackupOptions,
): Promise<void> {
  const normalizedDatabaseUrl = normalizePostgresUrl(options.databaseUrl);
  return new Promise((resolve, reject) => {
    execFile(
      "pg_dump",
      ["-Fc", "-d", normalizedDatabaseUrl, "-f", options.outputFile],
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Error during backup: ${error.message}`));
          return;
        }
        if (stderr) {
          reject(new Error(`pg_dump stderr: ${stderr}`));
          return;
        }
        resolve();
      },
    );
  });
}

interface PostgresRestoreOptions {
  databaseUrl: string;
  backupPath: string;
}

export function restorePostgresBackup({
  databaseUrl,
  backupPath,
}: PostgresRestoreOptions): Promise<void> {
  const normalizedDatabaseUrl = normalizePostgresUrl(databaseUrl);
  return new Promise((resolve, reject) => {
    execFile(
      "pg_restore",
      ["--clean", "--if-exists", "-d", normalizedDatabaseUrl, backupPath],
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`Error during restore: ${error.message}`));
          return;
        }
        resolve();
      },
    );
  });
}
