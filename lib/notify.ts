import { prisma } from "@/lib/db";

export async function notifyUser(args: {
  schoolId: string;
  userId: string;
  title: string;
  body?: string;
}) {
  await prisma.notification.create({
    data: {
      schoolId: args.schoolId,
      userId: args.userId,
      title: args.title,
      body: args.body ?? null
    }
  });
}

