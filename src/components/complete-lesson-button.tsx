"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setLessonProgress } from "@/app/actions/enrollment";

/**
 * "Mark complete" toggle. The button is disabled while the request is in
 * flight so a double click cannot fire two conflicting writes.
 */
export function CompleteLessonButton({
  lessonId,
  initiallyComplete,
  isLastLesson,
  nextHref,
}: {
  lessonId: string;
  initiallyComplete: boolean;
  isLastLesson: boolean;
  nextHref?: string;
}) {
  const [complete, setComplete] = useState(initiallyComplete);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !complete;
    setError(null);
    startTransition(async () => {
      try {
        await setLessonProgress({ lessonId, completed: next });
        setComplete(next);
      } catch {
        setError("Could not save progress.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={complete}
        className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          complete
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "border border-ink-300 bg-white text-ink-800 hover:border-ink-400"
        }`}
      >
        {pending ? "Saving..." : complete ? "Completed" : "Mark as complete"}
      </button>

      {complete && nextHref && (
        <Link
          href={nextHref}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {isLastLesson ? "Finish course" : "Next lesson"}
        </Link>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
