"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectStatusBadge } from "./project-status-badge";
import { ProjectForm } from "./project-form";
import type { ProjectWithMembers } from "@/services/projectService";

type User = { id: string; name: string; email: string };

interface Props {
  project: ProjectWithMembers;
  users: User[];
  onMutate: () => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProjectCard({ project, users, onMutate }: Props) {
  const [editOpen, setEditOpen] = useState(false);

  async function handleDelete() {
    if (!confirm(`Slett "${project.title}"?`)) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    onMutate();
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">{project.title}</h3>
              <ProjectStatusBadge status={project.status} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" />
                  Rediger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slett
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {project.members.slice(0, 4).map(({ user }) => (
                <Avatar key={user.id} className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.members.length > 4 && (
                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(project.updatedAt).toLocaleDateString("nb-NO")}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rediger prosjekt</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={project}
            users={users}
            onSuccess={() => { setEditOpen(false); onMutate(); }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
