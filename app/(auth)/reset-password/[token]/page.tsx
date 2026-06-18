import { getValidResetToken } from "@/services/passwordResetService";
import { ResetPasswordForm } from "./reset-password-form";
import { FolderKanban } from "lucide-react";
import Link from "next/link";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await getValidResetToken(token);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Nytt passord</h1>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {!record ? (
            <div className="text-center space-y-3">
              <p className="text-sm font-medium text-destructive">Lenken er ugyldig eller utløpt</p>
              <p className="text-sm text-muted-foreground">
                Be om en ny lenke på siden for glemt passord.
              </p>
            </div>
          ) : (
            <ResetPasswordForm token={token} />
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Tilbake til innlogging
          </Link>
        </p>
      </div>
    </div>
  );
}
