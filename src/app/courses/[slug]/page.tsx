import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RatingStars, formatDuration, formatLevel } from "@/components/course-card";
import { EnrollButton } from "@/components/enroll-button";
import { getCourseBySlug } from "@/lib/courses";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";

export async function generateMetadata(
  props: PageProps<"/courses/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const course = await getCourseBySlug(slug);

  if (!course) return { title: "Course not found" };

  return {
    title: course.title,
    description: course.subtitle ?? course.description.slice(0, 160),
  };
}

export default async function CourseDetailPage(props: PageProps<"/courses/[slug]">) {
  const { slug } = await props.params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();

  // Check enrollment and the instructor's own progress in parallel.
  const [enrollment, completedLessonIds] = await Promise.all([
    user
      ? db.enrollment.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    user
      ? db.lessonProgress.findMany({
          where: { userId: user.id, completed: true, lesson: { section: { courseId: course.id } } },
          select: { lessonId: true },
        })
      : Promise.resolve([]),
  ]);

  const isEnrolled = Boolean(enrollment) || user?.id === course.instructor.id;
  const isOwner = user?.id === course.instructor.id;
  const completed = new Set(completedLessonIds.map((entry) => entry.lessonId));

  const firstLesson = course.sections[0]?.lessons[0];
  const resumeLesson =
    course.sections
      .flatMap((section) => section.lessons)
      .find((lesson) => !completed.has(lesson.id)) ?? firstLesson;

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="bg-ink-900 py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem]">
          <div>
            {course.category && (
              <Link
                href={`/courses?category=${course.category.slug}`}
                className="text-sm font-semibold uppercase tracking-wide text-accent-400 hover:underline"
              >
                {course.category.name}
              </Link>
            )}
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="mt-3 text-lg text-ink-300">{course.subtitle}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {course.reviewCount > 0 ? (
                <RatingStars rating={course.rating} count={course.reviewCount} />
              ) : (
                <span className="text-ink-400">No ratings yet</span>
              )}
              <span className="text-ink-300">
                {course.studentCount.toLocaleString()} student
                {course.studentCount === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-5 text-sm text-ink-300">
              Created by{" "}
              <span className="font-semibold text-white">
                {course.instructor.name}
              </span>
              {course.instructor.headline && <> &middot; {course.instructor.headline}</>}
            </p>
          </div>

          {/* Enrollment card */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-ink-200 bg-white p-5 text-ink-900 shadow-lg">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.thumbnailUrl}
                  alt=""
                  className="mb-4 aspect-video w-full rounded-lg object-cover"
                />
              ) : null}

              <p className="text-3xl font-bold">
                {course.priceCents === 0
                  ? "Free"
                  : new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: course.currency,
                    }).format(course.priceCents / 100)}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {course.lessonCount} lessons &middot;{" "}
                {formatDuration(course.durationSeconds)}
              </p>

              <div className="mt-5">
                {isOwner ? (
                  <Link
                    href={`/instructor/courses/${course.slug}`}
                    className="block rounded-lg bg-ink-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-ink-800"
                  >
                    Edit your course
                  </Link>
                ) : isEnrolled ? (
                  <Link
                    href={resumeLesson ? `/learn/${course.slug}/${resumeLesson.id}` : `/learn/${course.slug}`}
                    className="block rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    {completed.size > 0 ? "Continue learning" : "Start course"}
                  </Link>
                ) : (
                  <EnrollButton
                    courseId={course.id}
                    courseSlug={course.slug}
                    isSignedIn={Boolean(user)}
                  />
                )}
              </div>

              <ul className="mt-5 space-y-2 border-t border-ink-100 pt-4 text-sm text-ink-600">
                <li>{formatLevel(course.level)}</li>
                <li>{course.lessonCount} video lessons</li>
                <li>Full lifetime access</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <section>
            <h2 className="text-2xl font-bold">What you will learn</h2>
            <div className="mt-4 max-w-none whitespace-pre-line text-ink-700">
              {course.description}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">Course content</h2>
            <p className="mt-1 text-sm text-ink-500">
              {course.sections.length} section{course.sections.length === 1 ? "" : "s"} &middot;{" "}
              {course.lessonCount} lesson{course.lessonCount === 1 ? "" : "s"} &middot;{" "}
              {formatDuration(course.durationSeconds)} total
            </p>

            <div className="mt-5 space-y-3">
              {course.sections.map((section) => (
                <details
                  key={section.id}
                  open={section.position === 0}
                  className="overflow-hidden rounded-lg border border-ink-200 bg-white"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold hover:bg-ink-50">
                    <span>{section.title}</span>
                    <span className="shrink-0 text-xs font-normal text-ink-500">
                      {section.lessons.length} lesson
                      {section.lessons.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <ul className="border-t border-ink-100">
                    {section.lessons.map((lesson) => {
                      // Preview lessons are watchable without enrolling, so link
                      // out. Everything else is locked.
                      const href = isEnrolled || lesson.isPreview
                        ? `/learn/${course.slug}/${lesson.id}`
                        : undefined;

                      return (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-4 border-b border-ink-50 px-5 py-3 text-sm last:border-0"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {completed.has(lesson.id) && (
                              <span className="text-emerald-600" aria-label="Completed">
                                &#10003;
                              </span>
                            )}
                            {href ? (
                              <Link
                                href={href}
                                className="truncate hover:text-brand-700 hover:underline"
                              >
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className="truncate text-ink-600">{lesson.title}</span>
                            )}
                            {lesson.isPreview && (
                              <span className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-ink-600">
                                Preview
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs text-ink-400">
                            {formatDuration(lesson.durationSeconds)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">Instructor</h2>
            <div className="mt-4 flex items-start gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {course.instructor.name[0]?.toUpperCase()}
              </span>
              <div>
                <p className="font-semibold">{course.instructor.name}</p>
                {course.instructor.headline && (
                  <p className="text-sm text-ink-600">{course.instructor.headline}</p>
                )}
                {course.instructor.bio && (
                  <p className="mt-2 text-sm text-ink-600">{course.instructor.bio}</p>
                )}
              </div>
            </div>
          </section>

          {course.reviews.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold">Student reviews</h2>
              <ul className="mt-5 space-y-5">
                {course.reviews.map((review) => (
                  <li key={review.id} className="border-b border-ink-100 pb-5 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-ink-200 text-xs font-bold">
                        {review.user.name[0]?.toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{review.user.name}</p>
                        <p className="text-xs text-ink-500">
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <RatingStars rating={review.rating} className="mt-2" />
                    {review.comment && (
                      <p className="mt-2 text-sm text-ink-700">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="hidden lg:block" />
      </div>
    </div>
  );
}
