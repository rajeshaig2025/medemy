import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LessonVideo } from "@/components/lesson-video";
import { CompleteLessonButton } from "@/components/complete-lesson-button";
import { EnrollButton } from "@/components/enroll-button";
import { formatDuration } from "@/components/course-card";
import { db } from "@/lib/db";
import { canViewLesson, getCurrentUser } from "@/lib/dal";

async function loadCourse(slug: string) {
  return db.course.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      instructorId: true,
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
              summary: true,
              content: true,
              kind: true,
              durationSeconds: true,
              isPreview: true,
              videoProvider: true,
              videoId: true,
              videoUrl: true,
            },
          },
        },
      },
    },
  });
}

/**
 * The lesson player, shared by /learn/[slug] and /learn/[slug]/[lessonId].
 * When no lessonId is given it resumes at the first incomplete lesson.
 */
export async function LearnView({ slug, lessonId }: { slug: string; lessonId?: string }) {
  const user = await getCurrentUser();
  const course = await loadCourse(slug);
  if (!course) notFound();

  const flat = course.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ ...lesson, sectionTitle: section.title })),
  );
  if (flat.length === 0) notFound();

  // Resume point: first incomplete lesson, falling back to the first lesson.
  let progressByLesson = new Map<string, boolean>();
  if (user) {
    const rows = await db.lessonProgress.findMany({
      where: { userId: user.id, lesson: { section: { courseId: course.id } } },
      select: { lessonId: true, completed: true },
    });
    progressByLesson = new Map(rows.map((row) => [row.lessonId, row.completed]));
  }

  const current =
    (lessonId ? flat.find((lesson) => lesson.id === lessonId) : undefined) ??
    flat.find((lesson) => !progressByLesson.get(lesson.id)) ??
    flat[0];

  const allowed = await canViewLesson(user?.id ?? null, current.id, course.instructorId);

  if (!allowed) {
    // Anonymous visitors are sent to log in and returned here afterwards.
    if (!user) {
      redirect(`/login?next=/learn/${course.slug}/${current.id}`);
    }
    return <LockedScreen courseId={course.id} courseSlug={course.slug} title={course.title} />;
  }

  const currentIndex = flat.findIndex((lesson) => lesson.id === current.id);
  const next = flat[currentIndex + 1];
  const isLast = currentIndex === flat.length - 1;

  return (
    <div className="bg-ink-100">
      <div className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <Link
              href={`/courses/${course.slug}`}
              className="text-xs font-semibold uppercase tracking-wide text-brand-700 hover:underline"
            >
              Course
            </Link>
            <h1 className="truncate font-semibold">{course.title}</h1>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 text-sm font-semibold text-ink-600 hover:text-ink-900"
          >
            My learning
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <LessonVideo
            provider={current.videoProvider}
            videoId={current.videoId}
            videoUrl={current.videoUrl}
            title={current.title}
            isPreview={current.isPreview}
            isSignedIn={Boolean(user)}
          />

          <div className="mt-5 rounded-xl border border-ink-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              {current.sectionTitle}
            </p>
            <h2 className="mt-1 text-xl font-bold">{current.title}</h2>
            {current.summary && <p className="mt-2 text-ink-600">{current.summary}</p>}

            {current.content && (
              <div className="mt-4 whitespace-pre-line border-t border-ink-100 pt-4 text-ink-700">
                {current.content}
              </div>
            )}

            {current.isPreview && !user && (
              <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
                This is a free preview. Enroll to watch the full course.
              </p>
            )}

            {user && user.id !== course.instructorId && (
              <div className="mt-5 border-t border-ink-100 pt-5">
                <CompleteLessonButton
                  lessonId={current.id}
                  initiallyComplete={Boolean(progressByLesson.get(current.id))}
                  isLastLesson={isLast}
                  nextHref={isLast ? "/dashboard" : `/learn/${course.slug}/${next.id}`}
                />
              </div>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
            <h2 className="border-b border-ink-200 px-4 py-3 text-sm font-semibold">
              Course content
            </h2>
            <div className="max-h-[70vh] overflow-y-auto">
              {course.sections.map((section) => (
                <div key={section.id}>
                  <p className="bg-ink-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {section.title}
                  </p>
                  <ul>
                    {section.lessons.map((lesson) => {
                      const active = lesson.id === current.id;
                      const done = progressByLesson.get(lesson.id);
                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/learn/${course.slug}/${lesson.id}`}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-start gap-2.5 border-l-2 px-4 py-2.5 text-sm transition ${
                              active
                                ? "border-brand-600 bg-brand-50 font-semibold text-brand-900"
                                : "border-transparent text-ink-700 hover:bg-ink-50"
                            }`}
                          >
                            <span className="mt-0.5 shrink-0" aria-hidden>
                              {done ? (
                                <span className="text-emerald-600">&#10003;</span>
                              ) : lesson.isPreview ? (
                                <span className="text-ink-400">&#9654;</span>
                              ) : (
                                <span className="text-ink-300">&#9675;</span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block">{lesson.title}</span>
                              <span className="mt-0.5 block text-xs text-ink-400">
                                {formatDuration(lesson.durationSeconds)}
                                {lesson.isPreview && " - Preview"}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LockedScreen({
  courseId,
  courseSlug,
  title,
}: {
  courseId: string;
  courseSlug: string;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">This lesson is part of {title}</h1>
      <p className="mt-2 text-ink-600">
        Enroll to unlock every lesson. Courses on CourseHub are free.
      </p>
      <div className="mx-auto mt-6 max-w-xs">
        <EnrollButton courseId={courseId} courseSlug={courseSlug} isSignedIn />
      </div>
    </div>
  );
}
