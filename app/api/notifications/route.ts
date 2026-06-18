import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotifications, markAllRead } from "@/services/notificationService";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const notifications = await getNotifications(session.user.id);
  return NextResponse.json(notifications);
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
