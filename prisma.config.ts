import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * `datasource.url` must be a string here, but it is only actually *used* by
 * commands that connect: migrate, db push, db seed. `prisma generate` does not
 * connect, and it runs from the package.json postinstall hook.
 *
 * Using `env("DATABASE_URL")` here therefore breaks `npm install` on a machine
 * (or a CI container, or a Firebase build) that has not got the variable set
 * yet, which would abort the deploy before it starts. So a placeholder is
 * substituted instead, and the commands that need a real database fail with a
 * connection error naming the placeholder.
 */
const PLACEHOLDER_URL = "postgresql://unresolved:unresolved@localhost:5432/unresolved";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? PLACEHOLDER_URL,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
