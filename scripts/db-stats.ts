import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [users, courses, lessons, sections, enrollments, reviews, progress, categories] =
    await Promise.all([
      db.user.count(),
      db.course.count(),
      db.lesson.count(),
      db.section.count(),
      db.enrollment.count(),
      db.review.count(),
      db.lessonProgress.count(),
      db.category.count(),
    ]);

  console.log("Row counts in Postgres:");
  console.log(`  users        ${users}`);
  console.log(`  categories   ${categories}`);
  console.log(`  courses      ${courses}`);
  console.log(`  sections     ${sections}`);
  console.log(`  lessons      ${lessons}`);
  console.log(`  enrollments  ${enrollments}`);
  console.log(`  progress     ${progress}`);
  console.log(`  reviews      ${reviews}`);

  const sample = await db.course.findFirst({
    where: { slug: "postgres-performance-tuning" },
    select: { title: true, status: true, priceCents: true, instructor: { select: { name: true } } },
  });
  console.log("\nSample course:", JSON.stringify(sample));
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message.split("\n")[0]);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
