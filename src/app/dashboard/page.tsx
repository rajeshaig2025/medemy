import Link from "next/link";
import type { Metadata } from "next";
import { getCourseProgress, getEnrollments, requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "My learning" };

export default async function DashboardPage() {
  const user = await requireUser();
  const enrollments = await getEnrollments(user.id);

  const withProgress = await Promise.all(
    enrollments.map(async (enrollment) => ({
      enrollment,
      progress: await getCourseProgress(user.id, enrollment.course.id),
    })),
  );

  const inProgress = withProgress.filter((row) => row.progress.percent < 100);
  const finished = withProgress.filter((row) => row.progress.percent === 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">My learning</h1>
      <p className="mt-1 text-ink-500">
        {enrollments.length === 0
          ? "You have not enrolled in anything yet."
          : `${enrollments.length} course${enrollments.length === 1 ? "" : "s"} enrolled`}
      </p>

      {user.role !== "STUDENT" && (
        <Link
          href="/instructor"
          className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Go to your instructor dashboard &rarr;
        </Link>
      )}

      {enrollments.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-ink-300 bg-white p-12 text-center">
          <h2 className="font-semibold">Nothing here yet</h2>
          <p className="mt-2 text-sm text-ink-500">
            Browse the catalog and enroll in your first course.
          </p>
          <Link
            href="/courses"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Browse courses
          </Link>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <Section title="Continue learning">
              {inProgress.map(({ enrollment, progress }) => (
                <EnrollmentRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  progress={progress}
                />
              ))}
            </Section>
          )}
          {finished.length > 0 && (
            <Section title="Completed">
              {finished.map(({ enrollment, progress }) => (
                <EnrollmentRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  progress={progress}
                />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

type EnrollmentShape = Awaited<ReturnType<typeof getEnrollments>>[number];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function EnrollmentRow({
  enrollment,
  progress,
}: {
  enrollment: EnrollmentShape;
  progress: { total: number; done: number; percent: number };
}) {
  const { course } = enrollment;
  const lessonCount = course.sections.reduce(
    (sum, section) => sum + section.lessons.length,
    0,
  );

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center">
      <Link
        href={`/courses/${course.slug}`}
        className="block w-full shrink-0 overflow-hidden rounded-lg bg-ink-200 sm:w-40"
      >
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center bg-gradient-to-br from-brand-500 to-brand-800 p-2 text-center text-xs font-semibold text-white">
            {course.title}
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">
          <Link href={`/courses/${course.slug}`} className="hover:text-brand-700">
            {course.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-ink-500">
          {course.instructor.name} &middot; {lessonCount} lessons
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div
            className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-200"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${course.title} progress`}
          >
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-ink-600">
            {progress.percent}%
          </span>
        </div>
      </div>

      <Link
        href={`/learn/${course.slug}`}
        className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        {progress.done > 0 ? "Resume" : "Start"}
      </Link>
    </article>
  );
}
