import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProject, getProjects } from "@/services/projectService";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const projects = await getProjects();
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { title, description, status, memberIds } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Tittel er påkrevd." }, { status: 400 });
  }

  const project = await createProject({ title, description, status, memberIds });
  return NextResponse.json(project, { status: 201 });
}
