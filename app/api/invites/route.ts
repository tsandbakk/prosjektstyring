import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createInvite } from "@/services/inviteService";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }
  const invite = await createInvite(session.user.id);
  return NextResponse.json({ token: invite.token }, { status: 201 });
}
