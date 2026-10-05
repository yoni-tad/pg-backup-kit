import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

export interface StorageAdapter {
  save(sourcePath: string, destinationPath: string): Promise<void>;
}

export class LocalStorage implements StorageAdapter {
  async save(sourcePath: string, destinationPath: string): Promise<void> {
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await rename(sourcePath, destinationPath);
  }
}
