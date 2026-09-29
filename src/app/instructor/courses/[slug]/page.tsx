import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDuration } from "@/components/course-card";
import { AddLessonForm, AddSectionForm } from "@/components/course-editor-forms";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { setCourseStatus } from "@/app/actions/courses";
import { isBunnyConfigured } from "@/lib/bunny";

export const metadata: Metadata = { title: "Edit course" };

export default async function EditCoursePage(props: PageProps<"/instructor/courses/[slug]">) {
  const user = await requireRole("INSTRUCTOR");
  const { slug } = await props.params;

  const course = await db.course.findFirst({
    where: { slug, instructorId: user.id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      sections: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              isPreview: true,
              videoId: true,
            },
          },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course) notFound();

  const lessonCount = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const canPublish = lessonCount > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/instructor" className="text-sm font-semibold text-brand-700 hover:underline">
        &larr; All courses
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {course._count.enrollments} student
            {course._count.enrollments === 1 ? "" : "s"} &middot; Status:{" "}
            <span className="font-semibold">{course.status.toLowerCase()}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.slug}`}
            className="rounded-lg border border-ink-300 px-3.5 py-2 text-sm font-semibold transition hover:border-ink-400"
          >
            Preview
          </Link>

          {course.status === "PUBLISHED" ? (
            <form action={setCourseStatus}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="intent" value="archive" />
              <button
                type="submit"
                className="rounded-lg border border-ink-300 px-3.5 py-2 text-sm font-semibold transition hover:border-ink-400"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={setCourseStatus}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="intent" value="publish" />
              <button
                type="submit"
                disabled={!canPublish}
                title={canPublish ? undefined : "Add at least one lesson before publishing"}
                className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Publish
              </button>
            </form>
          )}
        </div>
      </div>

      {!isBunnyConfigured() && (
        <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Video hosting is not configured. Add <code>BUNNY_STREAM_API_KEY</code> and{" "}
          <code>BUNNY_STREAM_LIBRARY_ID</code> to <code>.env</code> to upload lesson videos.
          You can still build the curriculum without it.
        </p>
      )}

      <section className="mt-8 rounded-xl border border-ink-200 bg-white p-5">
        <h2 className="font-semibold">Description</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-ink-600">{course.description}</p>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Curriculum</h2>
          <p className="text-sm text-ink-500">
            {course.sections.length} sections &middot; {lessonCount} lessons
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {course.sections.map((section, index) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-xl border border-ink-200 bg-white"
            >
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50 px-4 py-3">
                <h3 className="font-semibold">
                  <span className="mr-2 text-ink-400">Section {index + 1}</span>
                  {section.title}
                </h3>
                <span className="text-xs text-ink-500">
                  {section.lessons.length} lesson
                  {section.lessons.length === 1 ? "" : "s"}
                </span>
              </div>

              {section.lessons.length === 0 ? (
                <p className="px-4 py-4 text-sm text-ink-500">No lessons yet.</p>
              ) : (
                <ul className="divide-y divide-ink-50">
                  {section.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{lesson.title}</span>
                        {lesson.isPreview && (
                          <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-brand-700">
                            Preview
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {lesson.videoId ? "Video attached" : "No video"} &middot;{" "}
                        {formatDuration(lesson.durationSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-ink-100 p-4">
                <AddLessonForm
                  sectionId={section.id}
                  courseSlug={course.slug}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-ink-300 bg-white p-5">
          <h3 className="text-sm font-semibold">Add a section</h3>
          <div className="mt-3">
            <AddSectionForm courseId={course.id} courseSlug={course.slug} />
          </div>
        </div>
      </section>
    </div>
  );
}
