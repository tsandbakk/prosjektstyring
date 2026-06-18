import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteComment } from "@/services/commentService";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  const { commentId } = await params;
  const result = await deleteComment(commentId, session.user.id);
  if (!result) return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
