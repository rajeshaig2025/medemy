import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  // Signed-in users have no reason to see the form.
  if (await getCurrentUser()) redirect("/dashboard");

  const searchParams = await props.searchParams;
  const next =
    typeof searchParams.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-ink-500">
        Log in to continue your courses. New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Sign up free
        </Link>
      </p>
      <div className="mt-8">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
