import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage(props: PageProps<"/signup">) {
  if (await getCurrentUser()) redirect("/dashboard");

  const searchParams = await props.searchParams;
  const defaultRole =
    searchParams.role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">
        {defaultRole === "INSTRUCTOR" ? "Start teaching" : "Create your account"}
      </h1>
      <p className="mt-1 text-ink-500">
        {defaultRole === "INSTRUCTOR"
          ? "Publish a course and reach learners. Free to set up."
          : "Track your progress across every course you take."}
      </p>
      <div className="mt-8">
        <SignupForm defaultRole={defaultRole} />
      </div>
    </div>
  );
}
