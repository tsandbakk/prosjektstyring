import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cacheTag } from "next/cache";

export async function getAllUsers() {
  "use cache";
  cacheTag("users");
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: { name: string; email: string; password: string }) {
  const hashed = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: { name: data.name, email: data.email, password: hashed },
    select: { id: true, name: true, email: true },
  });
}

export async function verifyPassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}
