import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/require-permission";

export default async function YouTubeLearningPage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; holiday?: string; compose?: string }>;
}) {
  await requirePermission("LEARNING_CENTER", "VIEW");
  const { classId, holiday, compose } = await searchParams;
  const params = new URLSearchParams();
  if (classId) params.set("classId", classId);
  params.set("category", holiday === "1" ? "HOLIDAY_LEARNING" : "YOUTUBE_LEARNING");
  if (compose === "1") params.set("compose", "1");
  redirect(`/learning-center?${params.toString()}`);
}
