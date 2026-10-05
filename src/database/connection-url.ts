export function normalizePostgresUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("Database URL must use postgresql:// or postgres://");
  }

  url.searchParams.delete("schema");
  return url.toString();
}
