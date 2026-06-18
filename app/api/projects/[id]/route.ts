import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateProject, deleteProject } from "@/services/projectService";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

async function isMember(userId: string, projectId: string) {
  const row = await prisma.usersOnProjects.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { userId: true },
  });
  return row !== null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id } = await params;
  const userId = session.user?.id;
  if (!userId || !(await isMember(userId, id))) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const data = await req.json();
  const project = await updateProject(id, data);
  revalidateTag("projects", {});
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { id } = await params;
  const userId = session.user?.id;
  if (!userId || !(await isMember(userId, id))) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  await deleteProject(id);
  revalidateTag("projects", {});
  return new NextResponse(null, { status: 204 });
}
