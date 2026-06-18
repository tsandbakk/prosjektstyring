import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComments, createComment } from "@/services/commentService";
import { revalidateTag } from "next/cache";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { id } = await params;
  const since = new URL(req.url).searchParams.get("since");
  const comments = await getComments(id, since ? new Date(since) : undefined);
  return NextResponse.json(comments);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Tomt innhold" }, { status: 400 });
  const comment = await createComment({ projectId: id, userId: session.user.id, content });
  revalidateTag("projects", {});
  return NextResponse.json(comment, { status: 201 });
}
