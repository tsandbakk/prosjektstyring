import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/services/userService";

const INVITE_TTL_HOURS = 48;

export async function createInvite(createdById: string) {
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
  return prisma.invite.create({ data: { createdById, expiresAt } });
}

export async function getValidInvite(token: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return null;
  if (invite.usedAt) return null;
  if (invite.expiresAt < new Date()) return null;
  return invite;
}

export async function redeemInvite(
  token: string,
  data: { name: string; email: string; password: string }
) {
  const invite = await getValidInvite(token);
  if (!invite) throw new Error("invalid_token");

  const existing = await getUserByEmail(data.email);
  if (existing) throw new Error("duplicate_email");

  const hashed = await bcrypt.hash(data.password, 12);
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: { name: data.name, email: data.email, password: hashed },
      select: { id: true, name: true, email: true },
    }),
    prisma.invite.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);
  return user;
}
