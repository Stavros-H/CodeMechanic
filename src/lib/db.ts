import { Pool } from "pg";

const globalForDatabase = globalThis as typeof globalThis & {
  replitPostgresPool?: Pool;
};

export function getDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Replit PostgreSQL is not configured (DATABASE_URL is missing).");
  }

  if (!globalForDatabase.replitPostgresPool) {
    globalForDatabase.replitPostgresPool = new Pool({ connectionString });
  }

  return globalForDatabase.replitPostgresPool;
}
