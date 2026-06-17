import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWeeklyProjects } from "@/services/weeklyProjectService";
import { getRecentComments } from "@/services/commentService";
import { getProjects } from "@/services/projectService";
import { HomeClient } from "@/components/home/home-client";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [weeklyItems, recentComments, allProjects] = await Promise.all([
    getWeeklyProjects(session.user.id),
    getRecentComments(15),
    getProjects(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Hjem</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {new Date().toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      <HomeClient
        weeklyItems={weeklyItems}
        recentComments={recentComments}
        currentUserId={session.user.id}
        projects={allProjects.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }))}
      />
    </div>
  );
}
