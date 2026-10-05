import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export interface S3RetentionOptions {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  keep: number;
}

export async function applyS3Retention({
  endpoint,
  region,
  accessKey,
  secretKey,
  bucket,
  keep,
}: S3RetentionOptions): Promise<string[]> {
  if (keep < 1) {
    throw new Error("Retention count must be at least 1");
  }

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });

  const listResponse = await client.send(
    new ListObjectsV2Command({ Bucket: bucket }),
  );

  const backups = (listResponse.Contents || [])
    .filter(
      (item: { Key?: string; LastModified?: Date }) =>
        item.Key && item.Key.endsWith(".tar.gz"),
    )
    .map((item: { Key?: string; LastModified?: Date }) => ({
      key: item.Key!,
      lastModified: item.LastModified!,
    }))
    .sort(
      (a: { lastModified: Date }, b: { lastModified: Date }) =>
        b.lastModified.getTime() - a.lastModified.getTime(),
    );

  const backupsToDelete = backups.slice(keep);

  for (const backup of backupsToDelete) {
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: backup.key }),
    );
  }

  return backupsToDelete.map((b: { key: string }) => b.key);
}
