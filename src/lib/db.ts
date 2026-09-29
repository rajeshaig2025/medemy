import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client construction.
 *
 * Two constraints shaped this file:
 *
 * 1. Prisma 7 requires a driver adapter rather than a connection string in the
 *    schema, and validates the adapter against the `provider` in
 *    prisma/schema.prisma. They cannot disagree, so the provider is a single
 *    fixed value rather than something derived from DATABASE_URL.
 *
 * 2. Construction is deferred until the first query. `next build` imports every
 *    route module to collect page data, and `DATABASE_URL` may legitimately be
 *    absent at that point (it is supplied at runtime by the host). Building the
 *    client eagerly would throw during import and fail the build, so `db` is a
 *    Proxy that instantiates on first property access instead.
 */

let client: PrismaClient | undefined;

function buildClient() {
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

/** The shared client. Reused across hot reloads in development, where every
 *  edit would otherwise open another connection and exhaust the limit. */
function getClient() {
  if (client) return client;

  const globalForPrisma = globalThis as unknown as { prismaClient?: PrismaClient };
  if (process.env.NODE_ENV !== "production" && globalForPrisma.prismaClient) {
    client = globalForPrisma.prismaClient;
    return client;
  }

  client = buildClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClient = client;
  }
  return client;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const instance = getClient();
    const value = Reflect.get(instance, property, receiver);
    // Model delegates are objects with methods; bind so `this` stays correct.
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
