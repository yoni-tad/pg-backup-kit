import { describe, expect, it } from "vitest";
import { normalizePostgresUrl } from "../../src/database/connection-url.js";

describe("normalizePostgresUrl", () => {
  it("removes Prisma schema parameter", () => {
    const result = normalizePostgresUrl(
      "postgresql://postgres:password@localhost:5432/booked_db?schema=public",
    );

    expect(result).toBe(
      "postgresql://postgres:password@localhost:5432/booked_db",
    );
  });

  it("supports postgres:// URLs", () => {
    const result = normalizePostgresUrl(
      "postgres://postgres:password@localhost:5432/booked_db",
    );

    expect(result).toContain("postgres://");
  });

  it("preserves URL-encoded special characters in credentials", () => {
    const result = normalizePostgresUrl(
      "postgresql://postgres:pa%24%40ss@localhost:5432/booked_db?schema=public",
    );

    expect(result).toContain("pa%24%40ss");
  });

  it("preserves supported query parameters", () => {
    const result = normalizePostgresUrl(
      "postgresql://postgres:password@localhost:5432/booked_db?schema=public&sslmode=require",
    );

    expect(result).toContain("sslmode=require");

    expect(result).not.toContain("schema=public");
  });

  it("rejects non-PostgreSQL URLs", () => {
    expect(() =>
      normalizePostgresUrl("mysql://user:password@localhost:3306/db"),
    ).toThrow("Database URL must use postgresql:// or postgres://");
  });
});
