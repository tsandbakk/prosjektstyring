import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/services/passwordResetService";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-post mangler" }, { status: 400 });

  const token = await createPasswordResetToken(email);

  if (token) {
    try {
      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  // Always return success to avoid user enumeration
  return NextResponse.json({ ok: true });
}
