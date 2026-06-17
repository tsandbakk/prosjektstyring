"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, MessageCircle } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { ProjectStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusPicker } from "./status-picker";
import { ProjectForm } from "./project-form";
import { CommentThread } from "./comment-thread";
import type { ProjectWithMembers } from "@/services/projectService";
import type { CommentWithAuthor } from "@/services/commentService";
import { cn } from "@/lib/utils";

type User = { id: string; name: string; email: string };

interface Props {
  project: ProjectWithMembers;
  users: User[];
  onMutate: () => void;
  index: number;
  isLast: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function ProjectListRow({ project, users, onMutate, index, isLast, selected, onToggleSelect }: Props) {
  const { data: session } = useSession();
  const [editOpen, setEditOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(project._count.comments);
  const [lastComment, setLastComment] = useState<CommentWithAuthor | null>(project.comments[0] ?? null);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || !lastComment) { setHasUnread(false); return; }
    const stored = localStorage.getItem(`comments_viewed_${session.user.id}_${project.id}`);
    if (!stored) { setHasUnread(true); return; }
    setHasUnread(new Date(lastComment.createdAt).getTime() > parseInt(stored));
  }, [session?.user?.id, project.id, lastComment]);

  async function handleDelete() {
    if (!confirm(`Slett "${project.title}"?`)) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    onMutate();
  }

  function handleStatusChange(_status: ProjectStatus) {
    onMutate();
  }

  return (
    <>
      <Draggable draggableId={project.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={cn(
              "grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center px-4 py-3 group bg-background",
              !isLast && "border-b border-border",
              snapshot.isDragging ? "shadow-lg opacity-90 rounded-md" : "hover:bg-muted/30",
              selected && "bg-primary/5"
            )}
          >
            {/* Checkbox */}
            <div className="mr-3 flex items-center" onClick={(e) => e.stopPropagation()}>
              <div
                onClick={onToggleSelect}
                className={cn(
                  "h-4 w-4 rounded border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0",
                  selected ? "bg-primary border-primary" : "border-border hover:border-foreground/50"
                )}
              >
                {selected && (
                  <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>

            {/* Drag handle */}
            <div
              {...provided.dragHandleProps}
              className="mr-3 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5.5" cy="4" r="1.2" /><circle cx="10.5" cy="4" r="1.2" />
                <circle cx="5.5" cy="8" r="1.2" /><circle cx="10.5" cy="8" r="1.2" />
                <circle cx="5.5" cy="12" r="1.2" /><circle cx="10.5" cy="12" r="1.2" />
              </svg>
            </div>

            {/* Title + description + customer — clickable to edit */}
            <button
              className="min-w-0 pr-4 text-left focus:outline-none"
              onClick={() => setEditOpen(true)}
            >
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{project.title}</p>
              {project.customer && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{project.customer}</p>
              )}
              {project.description && !project.customer && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
              )}
            </button>

            {/* Status — inline picker */}
            <div className="w-28 flex justify-center" onClick={(e) => e.stopPropagation()}>
              <StatusPicker
                projectId={project.id}
                status={project.status}
                onChanged={handleStatusChange}
              />
            </div>

            {/* Members */}
            <div className="w-24 flex justify-center">
              <div className="flex -space-x-2">
                {project.members.slice(0, 3).map(({ user }) => (
                  <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 3 && (
                  <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-medium">
                    +{project.members.length - 3}
                  </div>
                )}
                {project.members.length === 0 && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {/* Comments */}
            <button
              onClick={(e) => { e.stopPropagation(); setCommentOpen(true); }}
              className="w-40 flex items-center gap-2 px-2 text-left group/comment focus:outline-none"
            >
              <div className="relative flex-shrink-0">
                <MessageCircle className={cn(
                  "h-4 w-4 transition-colors",
                  commentCount > 0 ? "text-muted-foreground group-hover/comment:text-foreground" : "text-muted-foreground/30 group-hover/comment:text-muted-foreground"
                )} />
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary border border-background" />
                )}
              </div>
              {lastComment ? (
                <span className={cn(
                  "text-xs truncate transition-colors group-hover/comment:text-foreground",
                  hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {lastComment.content}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/40 group-hover/comment:text-muted-foreground transition-colors">
                  Legg til…
                </span>
              )}
            </button>

            {/* Row actions */}
            <div className="w-16 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditOpen(true)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Rediger"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                title="Slett"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </Draggable>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
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

      <CommentThread
        projectId={project.id}
        projectTitle={project.title}
        open={commentOpen}
        onOpenChange={(open) => {
          setCommentOpen(open);
          if (!open) setHasUnread(false);
        }}
        onCommentAdded={(comment) => {
          setCommentCount((c) => c + 1);
          setLastComment(comment);
          setHasUnread(false);
        }}
      />
    </>
  );
}
