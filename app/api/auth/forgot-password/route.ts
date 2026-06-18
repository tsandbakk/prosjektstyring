import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/services/passwordResetService";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-post mangler" }, { status: 400 });

  const token = await createPasswordResetToken(email);
  console.log("[forgot-password] email:", email, "token found:", !!token);

  if (token) {
    try {
      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;
      console.log("[forgot-password] sending email to:", email);
      await sendPasswordResetEmail(email, resetUrl);
      console.log("[forgot-password] email sent ok");
    } catch (err) {
      console.error("[forgot-password] Failed to send email:", err);
    }
  }

  // Always return success to avoid user enumeration
  return NextResponse.json({ ok: true });
}
