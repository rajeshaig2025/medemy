"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, canViewLesson } from "@/lib/dal";
import { reviewSchema } from "@/lib/validation";

/**
 * Enrolls the current user in a course, then sends them to the first lesson.
 *
 * Server Actions are reachable by direct POST, so this re-checks the session
 * and the course state rather than trusting the caller.
 */
export async function enrollInCourse(courseId: string) {
  const user = await requireUser();

  const course = await db.course.findFirst({
    where: { id: courseId, status: "PUBLISHED" },
    select: { id: true, slug: true },
  });
  if (!course) throw new Error("Course not found");

  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    create: { userId: user.id, courseId: course.id },
    update: { lastViewedAt: new Date() },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/courses/${course.slug}`);
  redirect(`/learn/${course.slug}`);
}

export async function unenrollFromCourse(courseId: string) {
  const user = await requireUser();

  await db.enrollment.deleteMany({ where: { userId: user.id, courseId } });

  revalidatePath("/dashboard");
}

/** Marks a lesson complete / incomplete, or records a playback position. */
export async function setLessonProgress(input: {
  lessonId: string;
  completed?: boolean;
  positionSeconds?: number;
}) {
  const user = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: input.lessonId },
    select: { id: true, section: { select: { course: { select: { id: true, instructorId: true } } } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const course = lesson.section.course;
  const allowed = await canViewLesson(user.id, lesson.id, course.instructorId);
  if (!allowed) throw new Error("Not enrolled in this course");

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    create: {
      userId: user.id,
      lessonId: lesson.id,
      completed: input.completed ?? false,
      completedAt: input.completed ? new Date() : null,
      lastPositionSeconds: input.positionSeconds ?? 0,
    },
    update: {
      ...(input.completed !== undefined ? { completed: input.completed } : {}),
      ...(input.completed ? { completedAt: new Date() } : {}),
      ...(input.positionSeconds !== undefined
        ? { lastPositionSeconds: input.positionSeconds }
        : {}),
    },
  });

  // Stamping lastViewedAt keeps the "Continue learning" list in a useful order.
  await db.enrollment.updateMany({
    where: { userId: user.id, courseId: course.id },
    data: { lastViewedAt: new Date() },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/learn/${(await db.course.findUniqueOrThrow({
    where: { id: course.id },
    select: { slug: true },
  })).slug}`);
}

export type ReviewFormState = { message?: string } | undefined;

export async function submitReview(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const user = await requireUser();

  const parsed = reviewSchema.safeParse({
    courseId: formData.get("courseId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Invalid review." };
  }

  const { courseId, rating, comment } = parsed.data;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  });
  if (!enrollment) {
    return { message: "Enroll in the course before reviewing it." };
  }

  await db.review.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId, rating, comment },
    update: { rating, comment },
  });

  revalidatePath(`/courses/[slug]`, "page");
  return { message: "Thanks for your review!" };
}
