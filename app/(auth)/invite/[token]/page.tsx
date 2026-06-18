import { FolderKanban } from "lucide-react";
import { getValidInvite } from "@/services/inviteService";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getValidInvite(token);

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm text-center space-y-3">
          <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <FolderKanban className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ugyldig invitasjon</h1>
          <p className="text-sm text-muted-foreground">
            Denne invitasjonslenken er utløpt eller allerede brukt. Be om en ny fra teamet ditt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Du er invitert</h1>
          <p className="text-sm text-muted-foreground">
            Opprett kontoen din for å komme i gang
          </p>
        </div>
        <InviteForm token={token} />
      </div>
    </div>
  );
}
