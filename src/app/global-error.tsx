"use client";

// global-error replaces the root layout, so it renders its own document. It
// also does not inherit the app's global stylesheet, which is why globals.css
// is imported here directly. Importing it in a client component is fine.
import "./globals.css";
import { useEffect } from "react";

/**
 * Last-resort error boundary.
 *
 * `error.tsx` only covers errors inside a route segment. It does not catch
 * failures that happen while the root layout is still being assembled, such as
 * a throw inside `generateMetadata` during the initial RSC stream, so this file
 * exists for those.
 *
 * In production the browser never sees the real error text (Next substitutes a
 * generic message to avoid leaking connection strings), so the copy below is
 * deliberately generic and points at the most likely cause rather than trying
 * to branch on the message. The digest is the join key back to the server log.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
            CourseHub
          </p>
          <title>Something went wrong</title>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900">
            This page could not load
          </h1>
          <p className="mt-2 max-w-md text-ink-600">
            An error occurred while rendering. This is almost always a database
            connection problem rather than a bug in the page.
          </p>

          <div className="mt-6 max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
            <p className="font-semibold">If this is a fresh deployment</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Check that <code>DATABASE_URL</code> is set on the backend and
                points at a reachable Postgres instance.
              </li>
              <li>
                A <code>file:</code> URL will not work — hosted platforms have an
                ephemeral filesystem, so SQLite cannot be used.
              </li>
              <li>
                Migrations may not have been applied yet: run{" "}
                <code>prisma migrate deploy</code> against the same URL.
              </li>
            </ul>
          </div>

          {error.digest && (
            <p className="mt-5 font-mono text-xs text-ink-400">
              Reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
