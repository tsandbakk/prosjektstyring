import { prisma } from "@/lib/prisma";

export type WeeklyProjectWithDetails = Awaited<ReturnType<typeof getWeeklyProjects>>[number];

export async function getWeeklyProjects(userId: string) {
  return prisma.weeklyProject.findMany({
    where: { userId },
    include: {
      project: {
        select: { id: true, title: true, customer: true, status: true },
      },
    },
    orderBy: { order: "asc" },
  });
}

export async function addWeeklyProject(userId: string, projectId: string) {
  const max = await prisma.weeklyProject.aggregate({
    where: { userId },
    _max: { order: true },
  });
  return prisma.weeklyProject.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, order: (max._max.order ?? -1) + 1 },
    update: {},
    include: {
      project: {
        select: { id: true, title: true, customer: true, status: true },
      },
    },
  });
}

export async function removeWeeklyProject(userId: string, projectId: string) {
  return prisma.weeklyProject.deleteMany({ where: { userId, projectId } });
}

export async function reorderWeeklyProjects(userId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.weeklyProject.update({ where: { id }, data: { order: i } })
    )
  );
}
