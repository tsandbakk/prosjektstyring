import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  projectId?: string
) {
  return prisma.notification.create({
    data: { userId, type, message, projectId },
  });
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}
