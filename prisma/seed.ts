/**
 * Seeds categories, demo users and sample courses.
 *
 * Safe to re-run: it clears the course/review/progress tables and recreates
 * them, but leaves User rows alone (it upserts the demo accounts by email) so
 * you do not lose a session you are currently using.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type CourseLevel,
  type VideoProvider,
} from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "password123";

type SeedLesson = {
  title: string;
  summary?: string;
  minutes: number;
  isPreview?: boolean;
  provider?: VideoProvider;
  videoId?: string;
};

type SeedSection = {
  title: string;
  lessons: SeedLesson[];
};

type SeedCourse = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  instructor: string;
  thumbnailUrl?: string;
  sections: SeedSection[];
};

const categories = [
  { name: "Engineering", slug: "engineering", description: "Software engineering practice" },
  { name: "Data", slug: "data", description: "Databases, analytics and ML" },
  { name: "Design", slug: "design", description: "Product and visual design" },
  { name: "Business", slug: "business", description: "Product, marketing and ops" },
  { name: "Career", slug: "career", description: "Interviews and professional growth" },
];

const courses: SeedCourse[] = [
  {
    slug: "postgres-performance-tuning",
    title: "Practical Postgres Performance Tuning",
    subtitle: "Find the bottleneck before you add hardware",
    description: `Slow queries are almost always a missing or wrong index, or a query plan that changed under you. This course is about building the habit of reading a plan instead of guessing.

You will work through a realistic dataset and learn to:
- Read EXPLAIN ANALYZE output and spot the two failure modes that cause most pain: sequential scans on large tables and nested loop joins over high row estimates
- Choose indexes based on query shape, not on intuition, and know when an index is actively harmful
- Use extended statistics to fix bad row estimates
- Configure connection pooling so your app does not fall over on a traffic spike

Every module ends with a benchmark you run yourself, so you see the numbers move rather than taking the claims on faith.`,
    category: "data",
    level: "INTERMEDIATE",
    instructor: "aisha@coursehub.dev",
    thumbnailUrl: "https://picsum.photos/seed/postgres-tuning/640/360",
    sections: [
      {
        title: "Reading a query plan",
        lessons: [
          {
            title: "What EXPLAIN ANALYZE actually shows you",
            summary: "The one distinction that changes how you read every plan.",
            minutes: 8,
            isPreview: true,
          },
          { title: "Sequential scans and when they are fine", minutes: 11 },
          { title: "Nested loops, hash joins, merge joins", minutes: 14 },
        ],
      },
      {
        title: "Indexes",
        lessons: [
          { title: "B-tree indexes and the column order trap", minutes: 12 },
          { title: "Partial and expression indexes", minutes: 10 },
          { title: "Reading index usage statistics", minutes: 7 },
        ],
      },
      {
        title: "Estimates and planning",
        lessons: [
          { title: "Why row estimates go wrong", minutes: 9 },
          { title: "Extended statistics in practice", minutes: 13 },
        ],
      },
    ],
  },
  {
    slug: "react-server-components-in-anger",
    title: "React Server Components, In Anger",
    subtitle: "The mental model that makes RSC click",
    description: `Most RSC tutorials stop at "components can be server components". That is not enough to make good decisions.

This course builds the model from the bottom: what actually crosses the network boundary, why serialization is the limiting factor, and how that shapes where you put your 'use client' boundary.

You will:
- Trace a single render and see exactly which payloads cross the wire
- Decide correctly between Server Components, Server Actions and Route Handlers
- Fix the common failure modes: over-broad client boundaries, accidental waterfalls, and leaking server-only code into the bundle
- Use streaming and Suspense to avoid blocking on slow data`,
    category: "engineering",
    level: "INTERMEDIATE",
    instructor: "marco@coursehub.dev",
    thumbnailUrl: "https://picsum.photos/seed/react-rsc/640/360",
    sections: [
      {
        title: "The model",
        lessons: [
          {
            title: "The RSC payload, end to end",
            summary: "Follow one render from server to DOM.",
            minutes: 13,
            isPreview: true,
          },
          { title: "Why the boundary matters more than the syntax", minutes: 10 },
        ],
      },
      {
        title: "Deciding where code runs",
        lessons: [
          { title: "Server Components vs Server Actions vs Route Handlers", minutes: 15 },
          { title: "Keeping the client boundary small", minutes: 12 },
          { title: "Serialization traps", minutes: 9 },
        ],
      },
      {
        title: "Performance",
        lessons: [
          { title: "Killing accidental waterfalls", minutes: 11 },
          { title: "Streaming with Suspense", minutes: 8 },
        ],
      },
    ],
  },
  {
    slug: "design-systems-that-survive",
    title: "Design Systems That Survive Contact With a Roadmap",
    subtitle: "Tokens, components and the politics of adoption",
    description: `A design system fails for organisational reasons far more often than technical ones. This course spends most of its time on the adoption problem, because that is what kills them.

You will cover:
- Token architecture: primitive, semantic and component layers, and why skipping the semantic layer dooms you
- Component API design that survives a second use case
- Documentation that gets read
- Measuring adoption and knowing when to stop investing`,
    category: "design",
    level: "ALL_LEVELS",
    instructor: "priya@coursehub.dev",
    thumbnailUrl: "https://picsum.photos/seed/design-systems/640/360",
    sections: [
      {
        title: "Tokens",
        lessons: [
          { title: "Three layers of tokens", minutes: 10, isPreview: true },
          { title: "Theming without forking the system", minutes: 12 },
        ],
      },
      {
        title: "Components",
        lessons: [
          { title: "Designing an API for an unknown second case", minutes: 14 },
          { title: "Composition over configuration", minutes: 11 },
        ],
      },
      {
        title: "Adoption",
        lessons: [
          { title: "Measuring what actually gets used", minutes: 9 },
          { title: "Governance without a bottleneck", minutes: 10 },
        ],
      },
    ],
  },
  {
    slug: "technical-interviewing",
    title: "Technical Interviewing Without the Theatre",
    subtitle: "How to prepare when the format is not helpful",
    description: `Most interview prep optimises for the wrong thing. You are not trying to memorise solutions; you are trying to make your reasoning visible under mild time pressure.

This course covers:
- The three question types you will actually get, and what each is really testing
- Narrating your thinking without over-explaining
- What to do when you are stuck (this is the part nobody teaches)
- How to evaluate an offer and a team from the outside`,
    category: "career",
    level: "ALL_LEVELS",
    instructor: "marco@coursehub.dev",
    thumbnailUrl: "https://picsum.photos/seed/interviewing/640/360",
    sections: [
      {
        title: "Format",
        lessons: [
          { title: "What each question type is really testing", minutes: 12, isPreview: true },
          { title: "Thinking out loud without rambling", minutes: 8 },
        ],
      },
      {
        title: "Under pressure",
        lessons: [
          { title: "When you are genuinely stuck", minutes: 11 },
          { title: "Debugging live, with an interviewer watching", minutes: 13 },
        ],
      },
      {
        title: "Choosing",
        lessons: [
          { title: "Reading a team from an interview", minutes: 9 },
          { title: "Offer evaluation questions that get honest answers", minutes: 10 },
        ],
      },
    ],
  },
  {
    slug: "sql-for-analysts",
    title: "SQL for People Who Are Not Developers",
    subtitle: "Answer real questions from real data",
    description: `Built for analysts, product managers and founders who need to answer questions from a database without filing a ticket.

You will learn to:
- Write joins you can reason about, including the ones that quietly drop rows
- Use window functions, which is where most people's SQL learning stalls
- Think about grain: the single concept that prevents most wrong answers
- Avoid the queries that look fine and take four hours`,
    category: "data",
    level: "BEGINNER",
    instructor: "aisha@coursehub.dev",
    thumbnailUrl: "https://picsum.photos/seed/sql-analysts/640/360",
    sections: [
      {
        title: "Foundations",
        lessons: [
          { title: "Grain: the idea that makes queries make sense", minutes: 11, isPreview: true },
          { title: "Joins that quietly lose rows", minutes: 13 },
          { title: "Filtering, dates and the NULL trap", minutes: 9 },
        ],
      },
      {
        title: "Aggregating",
        lessons: [
          { title: "GROUP BY without fear", minutes: 12 },
          { title: "Window functions, from scratch", minutes: 16 },
        ],
      },
    ],
  },
  {
    slug: "pricing-your-first-product",
    title: "Pricing Your First Product",
    subtitle: "Numbers, positioning and the conversation with customers",
    description: `Pricing is the highest-leverage decision in an early product company, and it is usually made by guessing. This course gives you a defensible way to set a number.

You will:
- Build a value metric that scales with the customer's realised value
- Set an initial price and a change plan
- Run customer conversations that surface willingness to pay without leading the witness
- Know the three moments you should raise prices, and how to handle churn when you do`,
    category: "business",
    level: "BEGINNER",
    instructor: "priya@coursehub.dev",
    thumbnailUrl: "https://picsum.photos/seed/pricing/640/360",
    sections: [
      {
        title: "Value metric",
        lessons: [
          { title: "Finding the metric that scales with value", minutes: 14, isPreview: true },
          { title: "Value metric traps", minutes: 8 },
        ],
      },
      {
        title: "Setting a number",
        lessons: [
          { title: "Anchoring, floors and ceilings", minutes: 12 },
          { title: "Discounting without devaluing", minutes: 10 },
        ],
      },
      {
        title: "Changing it later",
        lessons: [
          { title: "When to raise prices", minutes: 9 },
          { title: "Handling the churn conversation", minutes: 11 },
        ],
      },
    ],
  },
];

async function main() {
  console.log("Seeding...");

  // Order matters: children before parents, since SQLite enforces FKs.
  await db.lessonProgress.deleteMany();
  await db.review.deleteMany();
  await db.enrollment.deleteMany();
  await db.lesson.deleteMany();
  await db.section.deleteMany();
  await db.course.deleteMany();

  for (const category of categories) {
    await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, description: category.description },
    });
  }
  console.log(`  ${categories.length} categories`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const accounts = [
    { name: "Aisha Rahman", email: "aisha@coursehub.dev", role: "INSTRUCTOR" as const },
    { name: "Marco Silva", email: "marco@coursehub.dev", role: "INSTRUCTOR" as const },
    { name: "Priya Nair", email: "priya@coursehub.dev", role: "INSTRUCTOR" as const },
    { name: "Sam Learner", email: "sam@coursehub.dev", role: "STUDENT" as const },
  ];

  const users = new Map<string, { id: string }>();
  for (const account of accounts) {
    const user = await db.user.upsert({
      where: { email: account.email },
      create: { ...account, passwordHash },
      update: { name: account.name, role: account.role },
      select: { id: true },
    });
    users.set(account.email, user);
  }
  console.log(`  ${accounts.length} users (password: "${DEMO_PASSWORD}")`);

  const categoryBySlug = new Map(
    (await db.category.findMany({ select: { id: true, slug: true } })).map((category) => [
      category.slug,
      category.id,
    ]),
  );

  for (const course of courses) {
    const instructor = users.get(course.instructor);
    if (!instructor) throw new Error(`Unknown instructor: ${course.instructor}`);

    const created = await db.course.create({
      data: {
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl ?? null,
        level: course.level,
        priceCents: 0,
        status: "PUBLISHED",
        publishedAt: new Date(),
        instructorId: instructor.id,
        categoryId: categoryBySlug.get(course.category) ?? null,
        sections: {
          create: course.sections.map((section, sectionIndex) => ({
            title: section.title,
            position: sectionIndex,
            lessons: {
              create: section.lessons.map((lesson, lessonIndex) => ({
                title: lesson.title,
                summary: lesson.summary ?? null,
                durationSeconds: lesson.minutes * 60,
                isPreview: lesson.isPreview ?? false,
                videoProvider: lesson.provider ?? "BUNNY",
                videoId: lesson.videoId ?? null,
                position: lessonIndex,
              })),
            },
          })),
        },
      },
      select: { id: true },
    });

    // Give the demo student an enrollment plus partial progress so the
    // dashboard and "Continue learning" state are not empty on first run.
    const student = users.get("sam@coursehub.dev");
    if (student) {
      const firstSection = await db.section.findFirst({
        where: { courseId: created.id },
        orderBy: { position: "asc" },
        select: { lessons: { orderBy: { position: "asc" }, select: { id: true } } },
      });
      const preview = firstSection?.lessons[0];

      await db.enrollment.create({
        data: {
          userId: student.id,
          courseId: created.id,
          lastViewedAt: new Date(),
        },
      });

      if (preview) {
        await db.lessonProgress.create({
          data: { userId: student.id, lessonId: preview.id, completed: true, completedAt: new Date() },
        });
      }
    }

    await db.review.create({
      data: {
        userId: users.get("sam@coursehub.dev")!.id,
        courseId: created.id,
        rating: course.slug === "design-systems-that-survive" ? 4 : 5,
        comment:
          course.slug === "postgres-performance-tuning"
            ? "The EXPLAIN section alone was worth it. I found a bad index in our main table the same afternoon."
            : "Clear, practical, and not padded out to hit a lesson count.",
      },
    });
  }

  console.log(`  ${courses.length} courses`);
  console.log("\nDone. Log in with any of:");
  for (const account of accounts) {
    console.log(`  ${account.email}  /  ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
