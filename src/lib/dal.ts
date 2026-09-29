import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * Data Access Layer.
 *
 * Every permission check lives here rather than in components, so a new call
 * site cannot forget to authorize. Components ask these helpers; they never
 * query the database directly for user-scoped data.
 *
 * `cache()` dedupes calls within one render pass, so a layout and a page that
 * both need the current user only cause a single query.
 */

/** The current user, or null if signed out. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return getSessionUser();
});

/** The current user, redirecting to login if signed out. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/** The current user, redirecting home if they lack the required role. */
export const requireRole = cache(
  async (role: SessionUser["role"]): Promise<SessionUser> => {
    const user = await requireUser();
    if (user.role !== role && user.role !== "ADMIN") {
      redirect("/");
    }
    return user;
  },
);

/** Courses the user has enrolled in, most recently touched first. */
export const getEnrollments = cache(async (userId: string) => {
  return db.enrollment.findMany({
    where: { userId },
    orderBy: { lastViewedAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          thumbnailUrl: true,
          instructor: { select: { name: true } },
          sections: { select: { lessons: { select: { id: true } } } },
        },
      },
    },
  });
});

/** How many lessons in a course the user has completed. */
export const getCourseProgress = cache(
  async (userId: string, courseId: string) => {
    const [total, done] = await Promise.all([
      db.lesson.count({ where: { section: { courseId } } }),
      db.lessonProgress.count({
        where: { userId, completed: true, lesson: { section: { courseId } } },
      }),
    ]);
    return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  },
);

/**
 * Can this user watch the given lesson?
 * True for the course owner and for preview lessons (even with no account at
 * all -- that is the point of a preview), otherwise only for enrolled users.
 */
export const canViewLesson = cache(
  async (userId: string | null, lessonId: string, courseInstructorId: string) => {
    if (userId && userId === courseInstructorId) return true;

    const lesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: {
        isPreview: true,
        section: { select: { course: { select: { id: true } } } },
      },
    });
    if (!lesson) return false;

    // Previews are public. This check has to come *before* the userId guard,
    // otherwise signed-out visitors could never watch a preview.
    if (lesson.isPreview) return true;

    if (!userId) return false;

    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.section.course.id } },
      select: { id: true },
    });
    return Boolean(enrollment);
  },
);
