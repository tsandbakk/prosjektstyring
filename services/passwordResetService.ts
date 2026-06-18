import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const record = await prisma.passwordResetToken.create({
    data: { userId: user.id, expiresAt },
  });
  return record.token;
}

export async function getValidResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}

export async function redeemResetToken(token: string, newPassword: string) {
  const record = await getValidResetToken(token);
  if (!record) throw new Error("invalid_token");

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);
}
