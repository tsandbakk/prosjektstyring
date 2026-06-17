import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { removeWeeklyProject } from "@/services/weeklyProjectService";

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { projectId } = await params;
  await removeWeeklyProject(session.user.id, projectId);
  return new NextResponse(null, { status: 204 });
}
