import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client construction.
 *
 * Prisma 7 requires a driver adapter rather than a connection string in the
 * schema. The adapter is not interchangeable at runtime: Prisma validates it
 * against the `provider` in prisma/schema.prisma and throws if they disagree,
 * which is why the provider is a single fixed value rather than something
 * derived from DATABASE_URL.
 *
 * The adapter is only *constructed* here, never connected, so importing this
 * module during `next build` does not require a reachable database.
 */

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env for local development, or to " +
        "the App Hosting backend's environment variables in production.",
    );
  }

  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL is a SQLite file path, but this project uses Postgres. " +
        "SQLite cannot be deployed to a hosted platform because the filesystem " +
        "is ephemeral. Point DATABASE_URL at a Postgres connection string.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      // Serverless and container platforms reuse instances across requests, so
      // keep the pool small. An external pooler (PgBouncer, or Neon's pooled
      // endpoint) is the right answer at real scale; this is just a ceiling.
      max: 5,
    }),
  });
}

// Reuse one client across hot reloads in development. Without this, every edit
// would open a new connection and eventually exhaust the database's connection
// limit.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
