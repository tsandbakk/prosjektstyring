import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/services/userService";
import { getProjects } from "@/services/projectService";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { InviteButton } from "@/components/team/invite-button";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default async function TeamPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [users, projects] = await Promise.all([getAllUsers(), getProjects()]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{users.length} medlemmer registrert</p>
        </div>
        <div className="flex flex-col items-end gap-2 min-w-0 max-w-sm">
          <InviteButton />
          <p className="text-xs text-muted-foreground text-right">
            Lenken er gyldig i 48 timer og kan kun brukes én gang.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const memberOf = projects.filter((p) => p.members.some((m) => m.userId === user.id));
          return (
            <Card key={user.id}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                {memberOf.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {memberOf.length} prosjekt{memberOf.length !== 1 ? "er" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {memberOf.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className="text-xs bg-muted rounded px-2 py-0.5 truncate max-w-[120px]"
                        >
                          {p.title}
                        </span>
                      ))}
                      {memberOf.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{memberOf.length - 3} til</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
