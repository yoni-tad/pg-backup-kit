import { randomUUID } from "node:crypto";

export type BackupJobStatus = "pending" | "running" | "completed" | "failed";

export interface BackupJob {
    id: string;
    status: BackupJobStatus;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}

export function createBackupJob(): BackupJob {
    return {
        id: randomUUID(),
        status: "pending",
    };
}