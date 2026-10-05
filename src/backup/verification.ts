import { unlink } from "node:fs/promises"
import { decompressFile } from "./compression"
import { restorePostgresBackup } from "../database/postgres"

interface VerifyBackupOptions {
    backupPath: string
    temporaryDatabaseUrl: string
    decompressedPath: string
}

export async function verifyBackup({backupPath, temporaryDatabaseUrl, decompressedPath}: VerifyBackupOptions): Promise<void> {
    try {
        await decompressFile({ inputPath: backupPath, outputPath: decompressedPath })
        await restorePostgresBackup({
            databaseUrl: temporaryDatabaseUrl,
            backupPath: decompressedPath,
        })
    } finally {
        await unlink(decompressedPath).catch(() => {})
    }
}