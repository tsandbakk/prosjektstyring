import { prisma } from "@/lib/prisma";
import { createNotification } from "./notificationService";

export type CommentWithAuthor = Awaited<ReturnType<typeof getComments>>[number];

export async function getComments(projectId: string, since?: Date) {
  return prisma.comment.findMany({
    where: {
      projectId,
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, userId } });
  if (!comment) return null;
  return prisma.comment.delete({ where: { id: commentId } });
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
        data.projectId,
        comment.content.slice(0, 150)
      )
    )
  );

  return comment;
}
