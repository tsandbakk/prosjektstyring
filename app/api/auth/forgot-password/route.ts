import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/services/passwordResetService";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-post mangler" }, { status: 400 });

  const token = await createPasswordResetToken(email);

  if (token) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  // Always return success to avoid user enumeration
  return NextResponse.json({ ok: true });
}
