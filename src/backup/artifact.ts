export interface BackupArtifact {
  id: string;
  jobId: string;
  database: string;
  filePath: string;
  createdAt: Date;
  sizeBytes: number;
  checksum: string;
  verified: boolean;
}
