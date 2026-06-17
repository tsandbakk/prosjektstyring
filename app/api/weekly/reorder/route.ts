import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reorderWeeklyProjects } from "@/services/weeklyProjectService";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { orderedIds } = await req.json();
  await reorderWeeklyProjects(session.user.id, orderedIds);
  return new NextResponse(null, { status: 204 });
}
