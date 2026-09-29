import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Used by the Prisma CLI (migrate, db push, studio, seed). The app itself
  // connects through a driver adapter -- see src/lib/db.ts.
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
