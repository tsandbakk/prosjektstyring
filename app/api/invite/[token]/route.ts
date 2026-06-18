import { NextResponse } from "next/server";
import { getValidInvite, redeemInvite } from "@/services/inviteService";
import { revalidateTag } from "next/cache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await getValidInvite(token);
  if (!invite) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, expiresAt: invite.expiresAt });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { name, email, password } = await req.json();

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Alle felt er påkrevd." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Passordet må være minst 8 tegn." },
      { status: 400 }
    );
  }

  try {
    const user = await redeemInvite(token, { name, email, password });
    revalidateTag("users", {});
    return NextResponse.json(user, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "duplicate_email") {
      return NextResponse.json(
        { error: "E-postadressen er allerede i bruk." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Ugyldig eller utløpt invitasjon." },
      { status: 400 }
    );
  }
}
