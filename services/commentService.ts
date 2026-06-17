import { prisma } from "@/lib/prisma";

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
  return prisma.comment.create({
    data,
    include: { author: { select: { id: true, name: true } } },
  });
}
