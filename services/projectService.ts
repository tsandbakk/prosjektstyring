import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";
import { createNotification } from "./notificationService";

export type ProjectWithMembers = Awaited<ReturnType<typeof getProjects>>[number];

export async function getProjects(filters?: { status?: ProjectStatus; userId?: string }) {
  return prisma.project.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.userId
        ? { members: { some: { userId: filters.userId } } }
        : {}),
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { comments: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export async function createProject(data: {
  title: string;
  description?: string;
  customer?: string;
  status?: ProjectStatus;
  memberIds?: string[];
}) {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      customer: data.customer,
      status: data.status ?? "ACTIVE",
      members: data.memberIds?.length
        ? { create: data.memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      comments: true,
      _count: { select: { comments: true } },
    },
  });
}

export async function updateProject(
  id: string,
  data: { title?: string; description?: string; customer?: string; status?: ProjectStatus; memberIds?: string[] }
) {
  const { memberIds, ...fields } = data;

  return prisma.$transaction(async (tx) => {
    if (memberIds !== undefined) {
      const existing = await tx.usersOnProjects.findMany({
        where: { projectId: id },
        select: { userId: true },
      });
      const existingIds = new Set(existing.map((m) => m.userId));
      const newIds = memberIds.filter((uid) => !existingIds.has(uid));

      await tx.usersOnProjects.deleteMany({ where: { projectId: id } });
      if (memberIds.length > 0) {
        await tx.usersOnProjects.createMany({
          data: memberIds.map((userId) => ({ userId, projectId: id })),
        });
      }

      if (newIds.length > 0) {
        const project = await tx.project.findUnique({ where: { id }, select: { title: true } });
        if (project) {
          await Promise.all(
            newIds.map((userId) =>
              createNotification(userId, "ADDED_TO_PROJECT", `Du ble lagt til i ${project.title}`, id)
            )
          );
        }
      }
    }
    return tx.project.update({
      where: { id },
      data: fields,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { comments: true } },
      },
    });
  });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}

export async function reorderProjects(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.project.update({ where: { id }, data: { order: index } })
    )
  );
}
