import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { getCategories, getPublishedCourses } from "@/lib/courses";

export default async function HomePage() {
  const [courses, categories] = await Promise.all([
    getPublishedCourses({ limit: 8 }),
    getCategories(),
  ]);

  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">
              Learn from working practitioners
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Practical courses, taught by people who do the work.
            </h1>
            <p className="mt-5 text-lg text-brand-100">
              Every course here is free to start. Enrol, watch, and keep the
              material for life.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
              >
                Browse courses
              </Link>
              <Link
                href="/signup?role=INSTRUCTOR"
                className="rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Start teaching
              </Link>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-xl font-bold">Browse by category</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/courses?category=${category.slug}`}
                className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
              >
                {category.name}
                <span className="ml-1.5 text-xs text-ink-400">
                  {category.courseCount}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold">Newest courses</h2>
          <Link href="/courses" className="text-sm font-semibold text-brand-700 hover:underline">
            View all
          </Link>
        </div>

        {courses.length === 0 ? (
          <EmptyCourses />
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function EmptyCourses() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-ink-300 bg-white p-10 text-center">
      <h3 className="font-semibold">No courses published yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
        Run the seed script to load sample courses, or sign up as an instructor
        and publish the first one.
      </p>
      <Link
        href="/instructor/courses/new"
        className="mt-5 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Create a course
      </Link>
    </div>
  );
}
