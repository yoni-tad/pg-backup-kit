import { createReadStream, createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";

interface compressFileProps {
  inputPath: string;
  outputPath: string;
}

export async function compressFile({
  inputPath,
  outputPath,
}: compressFileProps): Promise<void> {
  await pipeline(
    createReadStream(inputPath),
    createGzip(),
    createWriteStream(outputPath),
  );

  await unlink(inputPath);
}

export async function decompressFile({
  inputPath,
  outputPath,
}: compressFileProps): Promise<void> {
  await pipeline(
    createReadStream(inputPath),
    createGunzip(),
    createWriteStream(outputPath),
  );
}
