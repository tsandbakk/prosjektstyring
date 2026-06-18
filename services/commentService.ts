import { prisma } from "@/lib/prisma";
import { createNotification } from "./notificationService";

export type CommentWithAuthor = Awaited<ReturnType<typeof getComments>>[number];

export async function getComments(projectId: string) {
  return prisma.comment.findMany({
    where: { projectId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export type RecentComment = Awaited<ReturnType<typeof getRecentComments>>[number];

export async function getRecentComments(limit = 15) {
  return prisma.comment.findMany({
    include: {
      author: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createComment(data: { projectId: string; userId: string; content: string }) {
  const comment = await prisma.comment.create({
    data,
    include: {
      author: { select: { id: true, name: true } },
      project: { select: { title: true, members: { select: { userId: true } } } },
    },
  });

  const recipients = comment.project.members
    .map((m) => m.userId)
    .filter((id) => id !== data.userId);

  await Promise.all(
    recipients.map((userId) =>
      createNotification(
        userId,
        "COMMENT_ADDED",
        `${comment.author.name} kommenterte på ${comment.project.title}`,
        data.projectId
      )
    )
  );

  return comment;
}
