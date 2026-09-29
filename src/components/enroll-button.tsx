"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { enrollInCourse } from "@/app/actions/enrollment";

export function EnrollButton({
  courseId,
  courseSlug,
  isSignedIn,
}: {
  courseId: string;
  courseSlug: string;
  isSignedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <Link
        href={`/login?next=/courses/${courseSlug}`}
        className="block w-full rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Sign up to enroll free
      </Link>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      // enrollInCourse redirects on success. Anything it throws is a genuine
      // failure (network, validation, revoked session) and stays on this page.
      try {
        await enrollInCourse(courseId);
      } catch {
        setError("Could not enroll. Please try again.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enrolling..." : "Enroll for free"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
