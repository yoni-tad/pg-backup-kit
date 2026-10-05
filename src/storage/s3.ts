import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { StorageAdapter } from "./local";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { pipeline } from "node:stream/promises";

interface SupabaseStorageOptions {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export class SupabaseStorage implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor({
    endpoint,
    region,
    accessKey,
    secretKey,
    bucket,
  }: SupabaseStorageOptions) {
    this.client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
    this.bucket = bucket;
  }

  async save(sourcePath: string, destinationPath: string): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: destinationPath,
        Body: createReadStream(sourcePath),
        ContentType: "application/gzip",
      },
    });

    await upload.done();
  }

  async download(sourcePath: string, destinationPath: string): Promise<void> {
    await mkdir(dirname(destinationPath), { recursive: true });

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: sourcePath,
      }),
    );

    if (!response.Body) {
      throw new Error(`Failed to download file from S3: ${sourcePath}`);
    }

    await pipeline(
      response.Body as NodeJS.ReadableStream,
      createWriteStream(destinationPath),
    );
  }
}
