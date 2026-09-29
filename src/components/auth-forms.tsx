"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type AuthFormState } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(login, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.message && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.message}
        </p>
      )}

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
        autoComplete="current-password"
        required
        error={state?.errors?.password?.[0]}
      />

      <SubmitButton label="Log in" pendingLabel="Logging in..." />

      <p className="text-center text-sm text-ink-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function Field({
  id,
  name,
  label,
  type = "text",
  error,
  ...rest
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-brand-400 ${
          error ? "border-red-400" : "border-ink-300"
        }`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
