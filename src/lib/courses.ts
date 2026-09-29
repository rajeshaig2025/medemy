import "server-only";

import { db } from "@/lib/db";

/**
 * Course queries.
 *
 * Aggregates (rating, lesson count, total duration) are computed in JS from
 * narrowly-selected columns rather than with groupBy. For a paginated catalog
 * this is a single extra pass over rows we already fetched, and it keeps the
 * shape identical for SQLite and the Postgres migration later. If course counts
 * grow into the tens of thousands, move these to raw SQL aggregates.
 */

export type CourseCardData = {
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  rating: number;
  reviewCount: number;
  lessonCount: number;
  durationSeconds: number;
  level: string;
  priceCents: number;
  instructorName: string;
  categoryName: string | null;
};

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  thumbnailUrl: true,
  level: true,
  priceCents: true,
  instructor: { select: { name: true } },
  category: { select: { name: true } },
  reviews: { select: { rating: true } },
  sections: { select: { lessons: { select: { durationSeconds: true } } } },
} as const;

type CardRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  level: string;
  priceCents: number;
  instructor: { name: string };
  category: { name: string } | null;
  reviews: { rating: number }[];
  sections: { lessons: { durationSeconds: number }[] }[];
};

function toCardData(row: CardRow): CourseCardData {
  const ratings = row.reviews.map((review) => review.rating);
  const rating = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : 0;

  const lessons = row.sections.flatMap((section) => section.lessons);

  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    thumbnailUrl: row.thumbnailUrl,
    rating: Math.round(rating * 10) / 10,
    reviewCount: ratings.length,
    lessonCount: lessons.length,
    durationSeconds: lessons.reduce(
      (sum, lesson) => sum + lesson.durationSeconds,
      0,
    ),
    level: row.level,
    priceCents: row.priceCents,
    instructorName: row.instructor.name,
    categoryName: row.category?.name ?? null,
  };
}

export async function getPublishedCourses(options?: {
  query?: string;
  categorySlug?: string;
  limit?: number;
  skip?: number;
}): Promise<CourseCardData[]> {
  const { query, categorySlug, limit = 24, skip = 0 } = options ?? {};

  const rows = await db.course.findMany({
    where: {
      status: "PUBLISHED",
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { subtitle: { contains: query } },
              { description: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: cardSelect,
    take: limit,
    skip,
  });

  return rows.map(toCardData);
}

export async function countPublishedCourses(options?: {
  query?: string;
  categorySlug?: string;
}) {
  return db.course.count({
    where: {
      status: "PUBLISHED",
      ...(options?.categorySlug
        ? { category: { slug: options.categorySlug } }
        : {}),
      ...(options?.query
        ? {
            OR: [
              { title: { contains: options.query } },
              { subtitle: { contains: options.query } },
              { description: { contains: options.query } },
            ],
          }
        : {}),
    },
  });
}

export async function getCategories() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { courses: { where: { status: "PUBLISHED" } } } },
    },
  });

  return categories.map((category) => ({
    name: category.name,
    slug: category.slug,
    courseCount: category._count.courses,
  }));
}

/** Full course detail for the marketing page. Lessons are returned without video ids. */
export async function getCourseBySlug(slug: string) {
  const course = await db.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      description: true,
      thumbnailUrl: true,
      level: true,
      priceCents: true,
      currency: true,
      publishedAt: true,
      instructor: {
        select: { id: true, name: true, headline: true, bio: true, avatarUrl: true },
      },
      category: { select: { name: true, slug: true } },
      sections: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          lessons: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              summary: true,
              kind: true,
              durationSeconds: true,
              isPreview: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          user: { select: { name: true, avatarUrl: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) return null;

  const lessons = course.sections.flatMap((section) => section.lessons);

  // `course.reviews` is capped at 20 for display, so the average has to come
  // from a separate aggregate over *all* reviews. Otherwise a course with 500
  // reviews would show the mean of whichever 20 came back most recently.
  const [ratingRows, reviewCount] = await Promise.all([
    db.review.groupBy({
      by: ["rating"],
      where: { courseId: course.id },
      _count: { rating: true },
    }),
    db.review.count({ where: { courseId: course.id } }),
  ]);

  const ratingTotal = ratingRows.reduce(
    (sum, row) => sum + row.rating * row._count.rating,
    0,
  );
  const rating = reviewCount > 0 ? ratingTotal / reviewCount : 0;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    level: course.level,
    priceCents: course.priceCents,
    currency: course.currency,
    publishedAt: course.publishedAt,
    instructor: course.instructor,
    category: course.category,
    sections: course.sections,
    reviews: course.reviews,
    studentCount: course._count.enrollments,
    lessonCount: lessons.length,
    durationSeconds: lessons.reduce((sum, lesson) => sum + lesson.durationSeconds, 0),
    rating: Math.round(rating * 10) / 10,
    reviewCount,
  };
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof getCourseBySlug>>>;
