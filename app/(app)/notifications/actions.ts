"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/require";
import { redirect } from "next/navigation";

export async function markNotificationReadAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Unable to process request.");

  await db.notification.updateMany({
    where: { id, schoolId: session.schoolId, userId: session.userId },
    data: { readAt: new Date() }
  });
  redirect("/notifications");
}

export async function markAllReadAction() {
  const session = await requireSession();
  await db.notification.updateMany({
    where: { schoolId: session.schoolId, userId: session.userId, readAt: null },
    data: { readAt: new Date() }
  });
  redirect("/notifications");
}

