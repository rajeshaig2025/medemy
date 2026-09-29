"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signup, type AuthFormState } from "@/app/actions/auth";
import { Field } from "@/components/auth-forms";

export function SignupForm({ defaultRole }: { defaultRole: "STUDENT" | "INSTRUCTOR" }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signup, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {defaultRole === "INSTRUCTOR" && (
        <input type="hidden" name="role" value="INSTRUCTOR" />
      )}

      {state?.message && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

      <Field
        id="name"
        name="name"
        label="Full name"
        autoComplete="name"
        required
        error={state?.errors?.name?.[0]}
      />
      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={state?.errors?.email?.[0]}
      />
      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        error={state?.errors?.password?.[0]}
      />

      {defaultRole === "STUDENT" && (
        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            name="role"
            value="INSTRUCTOR"
            className="mt-0.5 size-4 rounded border-ink-300"
          />
          <span>
            I also want to publish courses
            <span className="block text-xs text-ink-500">
              You can switch to teaching at any time.
            </span>
          </span>
        </label>
      )}

      <SubmitButton
        label={defaultRole === "INSTRUCTOR" ? "Create instructor account" : "Create account"}
      />

      <p className="text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Creating account..." : label}
    </button>
  );
}
