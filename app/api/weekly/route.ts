import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWeeklyProjects, addWeeklyProject } from "@/services/weeklyProjectService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const items = await getWeeklyProjects(session.user.id);
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { projectId } = await req.json();
  if (!projectId) return NextResponse.json({ error: "Mangler projectId" }, { status: 400 });
  const item = await addWeeklyProject(session.user.id, projectId);
  return NextResponse.json(item, { status: 201 });
}
