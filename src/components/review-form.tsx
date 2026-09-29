"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitReview, type ReviewFormState } from "@/app/actions/enrollment";

export function ReviewForm({ courseId }: { courseId: string }) {
  const [state, formAction] = useActionState<ReviewFormState, FormData>(
    submitReview,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />

      <div>
        <label htmlFor="rating" className="block text-sm font-medium">
          Your rating
        </label>
        <select
          id="rating"
          name="rating"
          defaultValue="5"
          className="mt-1 w-32 rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium">
          Review <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          placeholder="What did you find useful? What was missing?"
          className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
      </div>

      <SubmitButton />

      {state?.message && (
        <p role="status" className="text-sm text-ink-600">
          {state.message}
        </p>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Submitting..." : "Submit review"}
    </button>
  );
}
