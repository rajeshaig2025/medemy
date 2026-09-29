import type { Metadata } from "next";
import { LearnView } from "@/components/learn-view";

export const metadata: Metadata = { title: "Lesson" };

export default async function LessonPage(props: PageProps<"/learn/[slug]/[lessonId]">) {
  const { slug, lessonId } = await props.params;
  return <LearnView slug={slug} lessonId={lessonId} />;
}
