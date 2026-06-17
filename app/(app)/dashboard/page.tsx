import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProjects } from "@/services/projectService";
import { getAllUsers } from "@/services/userService";
import { getWeeklyProjects } from "@/services/weeklyProjectService";
import { DashboardClient } from "@/components/projects/dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [projects, users, weeklyItems] = await Promise.all([
    getProjects(),
    getAllUsers(),
    getWeeklyProjects(session.user.id),
  ]);

  return (
    <DashboardClient
      projects={projects}
      users={users}
      currentUserId={session.user.id}
      initialWeeklyItems={weeklyItems}
    />
  );
}
