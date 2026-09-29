import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";

/**
 * The session read happens inside a Suspense boundary (see `UserMenu`) so the
 * header shell streams immediately instead of blocking on a database query.
 */
export async function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">
            C
          </span>
          <span className="hidden sm:inline">CourseHub</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-ink-600">
          <Link
            href="/courses"
            className="rounded-md px-3 py-2 transition hover:bg-ink-100 hover:text-ink-900"
          >
            Courses
          </Link>
          <Link
            href="/courses"
            className="hidden rounded-md px-3 py-2 transition hover:bg-ink-100 hover:text-ink-900 sm:inline"
          >
            Categories
          </Link>
        </nav>

        <form action="/courses" className="ml-auto hidden max-w-md flex-1 md:block">
          <label htmlFor="header-search" className="sr-only">
            Search courses
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search for anything"
            className="w-full rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-sm outline-none transition focus:border-brand-400 focus:bg-white"
          />
        </form>

        <UserMenu />
      </div>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/login"
          className="rounded-md px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-100"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex shrink-0 items-center gap-2">
      {user.role !== "STUDENT" && (
        <Link
          href="/instructor"
          className="hidden rounded-md px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:inline"
        >
          Teach
        </Link>
      )}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition hover:bg-ink-100"
      >
        <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {initials}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{user.name}</span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md px-2.5 py-2 text-sm font-medium text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
