import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { getCategories, getPublishedCourses } from "@/lib/courses";

export const metadata = {
  title: "Browse courses",
  description: "Search and filter every published course on CourseHub.",
};

const PAGE_SIZE = 12;

export default async function CoursesPage(props: PageProps<"/courses">) {
  // searchParams is a Promise in Next.js 16.
  const searchParams = await props.searchParams;

  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const categorySlug =
    typeof searchParams.category === "string" ? searchParams.category : undefined;
  const page = Number(searchParams.page ?? "1");
  const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  const [courses, categories] = await Promise.all([
    getPublishedCourses({
      query: query || undefined,
      categorySlug,
      limit: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
    getCategories(),
  ]);

  const activeCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          {query
            ? `Results for "${query}"`
            : activeCategory
              ? activeCategory.name
              : "All courses"}
        </h1>
        <p className="mt-1 text-ink-500">
          {activeCategory && query
            ? `${activeCategory.name} courses matching "${query}"`
            : "Free courses across engineering, design, business and data."}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="md:hidden">
            <form action="/courses" className="flex gap-2">
              <label htmlFor="catalog-search" className="sr-only">
                Search courses
              </label>
              <input
                id="catalog-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search courses"
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Go
              </button>
            </form>
          </div>

          <h2 className="hidden text-sm font-semibold uppercase tracking-wide text-ink-500 lg:block">
            Categories
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0">
            <li>
              <Link
                href={buildHref({ q: query })}
                className={linkClasses(!categorySlug)}
              >
                All
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={buildHref({ q: query, category: category.slug })}
                  className={linkClasses(categorySlug === category.slug)}
                >
                  {category.name}
                  <span className="ml-auto text-xs text-ink-400">
                    {category.courseCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex-1">
          {courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-300 bg-white p-12 text-center">
              <h2 className="font-semibold">No courses matched</h2>
              <p className="mt-2 text-sm text-ink-500">
                Try a different search term, or clear the category filter.
              </p>
              <Link
                href="/courses"
                className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Clear all filters
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <CourseCard key={course.slug} course={course} />
                ))}
              </div>
              <Pagination
                page={currentPage}
                query={query}
                categorySlug={categorySlug}
                hasNext={courses.length === PAGE_SIZE}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function linkClasses(active: boolean) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition lg:mb-1 ${
    active
      ? "bg-brand-50 text-brand-800"
      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
  }`;
}

function buildHref(params: { q?: string; category?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  const qs = search.toString();
  return qs ? `/courses?${qs}` : "/courses";
}

function Pagination({
  page,
  query,
  categorySlug,
  hasNext,
}: {
  page: number;
  query: string;
  categorySlug?: string;
  hasNext: boolean;
}) {
  if (page === 1 && !hasNext) return null;

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
      {page > 1 ? (
        <Link
          href={buildPageHref(page - 1, query, categorySlug)}
          className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ink-300"
        >
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink-500">Page {page}</span>
      {hasNext && (
        <Link
          href={buildPageHref(page + 1, query, categorySlug)}
          className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ink-300"
        >
          Next
        </Link>
      )}
    </nav>
  );
}

function buildPageHref(page: number, query: string, categorySlug?: string) {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (categorySlug) search.set("category", categorySlug);
  search.set("page", String(page));
  return `/courses?${search.toString()}`;
}
