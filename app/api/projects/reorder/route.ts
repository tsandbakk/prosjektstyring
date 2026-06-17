import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reorderProjects } from "@/services/projectService";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const { orderedIds } = await req.json();
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "Ugyldig data" }, { status: 400 });
  }

  await reorderProjects(orderedIds);
  return new NextResponse(null, { status: 204 });
}
