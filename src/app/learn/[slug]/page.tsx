import type { Metadata } from "next";
import { LearnView } from "@/components/learn-view";

export const metadata: Metadata = { title: "Learning" };

export default async function LearnIndexPage(props: PageProps<"/learn/[slug]">) {
  const { slug } = await props.params;
  // LearnView picks the resume point when there is no explicit lessonId.
  return <LearnView slug={slug} />;
}
