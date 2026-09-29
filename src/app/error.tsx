"use client";

import { useEffect } from "react";

/**
 * Root error boundary.
 *
 * In production the browser shows a generic message plus a digest id, because
 * the real error text can contain connection strings. The digest is the hook
 * for matching this screen against the server logs.
 *
 * This exists mainly to make one common deployment mistake legible: pointing a
 * hosted environment at a SQLite DATABASE_URL, which cannot work because the
 * filesystem there is ephemeral.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-ink-600">
        The page failed to load. This usually means the app cannot reach its
        database.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ink-400">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
        <p className="font-semibold">If this is a fresh deployment</p>
        <p className="mt-1">
          A SQLite <code>DATABASE_URL</code> (starting with{" "}
          <code>file:</code>) cannot work on a hosted platform, because the
          filesystem is ephemeral. Set <code>DATABASE_URL</code> to a Postgres
          connection string and redeploy.
        </p>
      </div>

      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  );
}
