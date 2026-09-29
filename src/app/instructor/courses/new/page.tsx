import Link from "next/link";
import type { Metadata } from "next";
import { CreateCourseForm } from "@/components/create-course-form";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Create a course" };

export default async function NewCoursePage() {
  await requireRole("INSTRUCTOR");

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/instructor" className="text-sm font-semibold text-brand-700 hover:underline">
        &larr; Instructor dashboard
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">Create a course</h1>
      <p className="mt-1 text-ink-500">
        This creates a draft. Nothing is visible to learners until you publish.
      </p>

      <div className="mt-8">
        <CreateCourseForm categories={categories} />
      </div>
    </div>
  );
}
