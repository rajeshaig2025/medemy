import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-lg font-bold">CourseHub</p>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            A place to publish and take practical courses. Anyone can teach here.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Learn</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>
              <Link href="/courses" className="hover:text-brand-700">
                Browse courses
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-brand-700">
                My learning
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Teach</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>
              <Link href="/signup?role=INSTRUCTOR" className="hover:text-brand-700">
                Become an instructor
              </Link>
            </li>
            <li>
              <Link href="/instructor" className="hover:text-brand-700">
                Instructor dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-6 text-center text-xs text-ink-400">
        Built with Next.js, Prisma and Bunny Stream.
      </div>
    </footer>
  );
}
