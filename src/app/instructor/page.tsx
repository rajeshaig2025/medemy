import Link from "next/link";
import type { Metadata } from "next";
import { formatLevel } from "@/components/course-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Instructor dashboard" };

export default async function InstructorPage() {
  const user = await requireRole("INSTRUCTOR");

  const courses = await db.course.findMany({
    where: { instructorId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      level: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
      priceCents: true,
      _count: { select: { enrollments: true, sections: true } },
      reviews: { select: { rating: true } },
    },
  });

  const published = courses.filter((course) => course.status === "PUBLISHED");
  const totalStudents = published.reduce(
    (sum, course) => sum + course._count.enrollments,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructor dashboard</h1>
          <p className="mt-1 text-ink-500">
            {courses.length} course{courses.length === 1 ? "" : "s"} &middot;{" "}
            {totalStudents} total enrollment{totalStudents === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/instructor/courses/new"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Create a course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-ink-300 bg-white p-12 text-center">
          <h2 className="font-semibold">You have not created a course yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Drafts stay private until you publish them, so you can build the
            curriculum at your own pace.
          </p>
          <Link
            href="/instructor/courses/new"
            className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-ink-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th scope="col" className="px-5 py-3">Course</th>
                <th scope="col" className="hidden px-5 py-3 sm:table-cell">Status</th>
                <th scope="col" className="hidden px-5 py-3 md:table-cell">Level</th>
                <th scope="col" className="px-5 py-3">Students</th>
                <th scope="col" className="hidden px-5 py-3 lg:table-cell">Price</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {courses.map((course) => {
                const ratings = course.reviews.map((review) => review.rating);
                const average = ratings.length
                  ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
                  : null;

                return (
                  <tr key={course.id} className="hover:bg-ink-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/instructor/courses/${course.slug}`}
                        className="font-semibold hover:text-brand-700"
                      >
                        {course.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {course._count.sections} sections
                        {average !== null && ` - rated ${average.toFixed(1)}/5`}
                      </p>
                    </td>
                    <td className="hidden px-5 py-4 sm:table-cell">
                      <StatusBadge status={course.status} />
                    </td>
                    <td className="hidden px-5 py-4 text-ink-600 md:table-cell">
                      {formatLevel(course.level)}
                    </td>
                    <td className="px-5 py-4 text-ink-600">
                      {course._count.enrollments}
                    </td>
                    <td className="hidden px-5 py-4 text-ink-600 lg:table-cell">
                      {course.priceCents === 0
                        ? "Free"
                        : `$${(course.priceCents / 100).toFixed(2)}`}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/instructor/courses/${course.slug}`}
                        className="text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PUBLISHED: "bg-emerald-50 text-emerald-700",
    DRAFT: "bg-ink-100 text-ink-600",
    ARCHIVED: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] ?? styles.DRAFT}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
