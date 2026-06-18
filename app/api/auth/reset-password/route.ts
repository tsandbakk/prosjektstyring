import { NextResponse } from "next/server";
import { redeemResetToken } from "@/services/passwordResetService";

export async function POST(req: Request) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Mangler felt" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Passordet må være minst 8 tegn" }, { status: 400 });

  try {
    await redeemResetToken(token, password);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lenken er ugyldig eller utløpt" }, { status: 400 });
  }
}
