"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { slugify } from "@/lib/validation";
import { createBunnyUpload } from "@/lib/bunny";

export type CourseFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

const courseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, { error: "Title must be at least 8 characters." })
    .max(120, { error: "Title must be 120 characters or fewer." }),
  subtitle: z.string().trim().max(160).optional(),
  description: z
    .string()
    .trim()
    .min(30, { error: "Describe what learners will achieve (30+ characters)." }),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]),
  categoryId: z.string().min(1, { error: "Pick a category." }),
  // The form collects dollars; the database stores integer cents so that
  // rounding never depends on floating point at checkout time.
  priceDollars: z.coerce.number().min(0).max(1000).default(0),
});

export async function createCourse(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireRole("INSTRUCTOR");

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    description: formData.get("description"),
    level: formData.get("level"),
    categoryId: formData.get("categoryId"),
    priceDollars: formData.get("priceDollars") || 0,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { title, subtitle, description, level, categoryId, priceDollars } = parsed.data;
  const priceCents = Math.round(priceDollars * 100);

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return { message: "That category no longer exists." };
  }

  const course = await db.course.create({
    data: {
      title,
      subtitle: subtitle ?? null,
      description,
      level,
      categoryId: category.id,
      priceCents,
      slug: await uniqueSlug(title),
      instructorId: user.id,
      // Courses start as drafts so a half-built course is never public.
      status: "DRAFT",
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/instructor");
  redirect(`/instructor/courses/${course.slug}`);
}

/** Appends -2, -3, ... until the slug is free. */
async function uniqueSlug(title: string) {
  const base = slugify(title) || "course";
  let candidate = base;
  let suffix = 1;

  while (await db.course.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

const lessonSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().trim().min(3, { error: "Lesson title is too short." }).max(160),
  summary: z.string().trim().max(300).optional(),
  durationMinutes: z.coerce.number().int().min(0).max(600).default(0),
  isPreview: z.coerce.boolean().default(false),
  bunnyVideoId: z.string().trim().max(200).optional(),
});

export type LessonFormState = { message?: string; errors?: Record<string, string[]> } | undefined;

/**
 * Adds a lesson. Authorization is re-checked here because Server Actions are
 * reachable by direct POST from anywhere.
 */
export async function addLesson(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const user = await requireRole("INSTRUCTOR");

  const parsed = lessonSchema.safeParse({
    sectionId: formData.get("sectionId"),
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
    durationMinutes: formData.get("durationMinutes") || 0,
    isPreview: formData.get("isPreview") === "on",
    bunnyVideoId: formData.get("bunnyVideoId") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { sectionId, title, summary, durationMinutes, isPreview, bunnyVideoId } = parsed.data;

  const section = await db.section.findFirst({
    where: { id: sectionId, course: { instructorId: user.id } },
    select: { id: true, courseId: true, course: { select: { slug: true } } },
  });
  if (!section) return { message: "You do not have permission to edit that section." };

  const last = await db.lesson.findFirst({
    where: { sectionId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.lesson.create({
    data: {
      sectionId,
      title,
      summary: summary ?? null,
      durationSeconds: durationMinutes * 60,
      isPreview,
      videoId: bunnyVideoId ?? null,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidatePath(`/instructor/courses/${section.course.slug}`);
  revalidatePath(`/courses/${section.course.slug}`);
  return { message: "Lesson added." };
}

const sectionSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
});

export async function addSection(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const user = await requireRole("INSTRUCTOR");

  const parsed = sectionSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Invalid section." };

  const course = await db.course.findFirst({
    where: { id: parsed.data.courseId, instructorId: user.id },
    select: { id: true, slug: true },
  });
  if (!course) return { message: "Course not found." };

  const last = await db.section.findFirst({
    where: { courseId: course.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.section.create({
    data: {
      courseId: course.id,
      title: parsed.data.title,
      position: (last?.position ?? -1) + 1,
    },
  });

  revalidatePath(`/instructor/courses/${course.slug}`);
  return { message: "Section added." };
}

export async function setCourseStatus(formData: FormData) {
  const user = await requireRole("INSTRUCTOR");

  const courseId = String(formData.get("courseId") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!courseId) return;

  const course = await db.course.findFirst({
    where: { id: courseId, instructorId: user.id },
    select: { id: true, slug: true, status: true },
  });
  if (!course) return;

  const status =
    intent === "publish"
      ? "PUBLISHED"
      : intent === "archive"
        ? "ARCHIVED"
        : "DRAFT";

  await db.course.update({
    where: { id: course.id },
    data: { status, publishedAt: status === "PUBLISHED" ? new Date() : null },
  });

  revalidatePath("/instructor");
  revalidatePath(`/instructor/courses/${course.slug}`);
  revalidatePath("/courses");
}

/**
 * Requests a Bunny direct-upload slot for a lesson video.
 * Returns the video id; the browser then uploads the file straight to Bunny.
 */
export async function requestVideoUpload(title: string) {
  await requireRole("INSTRUCTOR");
  return createBunnyUpload(title);
}
