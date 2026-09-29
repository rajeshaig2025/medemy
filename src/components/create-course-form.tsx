"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createCourse, type CourseFormState } from "@/app/actions/courses";
import { Field } from "@/components/auth-forms";

export function CreateCourseForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<CourseFormState, FormData>(
    createCourse,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state?.message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <Field
        id="title"
        name="title"
        label="Course title"
        placeholder="e.g. Practical Postgres Performance Tuning"
        required
        error={state?.errors?.title?.[0]}
      />

      <Field
        id="subtitle"
        name="subtitle"
        label="Subtitle"
        placeholder="One line on what learners will get out of it"
        error={state?.errors?.subtitle?.[0]}
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink-700">
          What will learners be able to do?
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          placeholder="Describe the outcomes. Be specific - this is the main sales copy."
          aria-invalid={state?.errors?.description ? true : undefined}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-brand-400 ${
            state?.errors?.description ? "border-red-400" : "border-ink-300"
          }`}
        />
        {state?.errors?.description && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-ink-700">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {state?.errors?.categoryId && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {state.errors.categoryId[0]}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="level" className="block text-sm font-medium text-ink-700">
            Level
          </label>
          <select
            id="level"
            name="level"
            defaultValue="ALL_LEVELS"
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="ALL_LEVELS">All levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="priceDollars" className="block text-sm font-medium text-ink-700">
          Price (USD)
        </label>
        <input
          id="priceDollars"
          name="priceDollars"
          type="number"
          min="0"
          step="0.01"
          defaultValue="0"
          className="mt-1 w-40 rounded-lg border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <p className="mt-1 text-xs text-ink-500">
          Leave at 0 for a free course. Payments are not wired up yet, so paid
          courses will not charge anyone.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating..." : "Create draft course"}
    </button>
  );
}
