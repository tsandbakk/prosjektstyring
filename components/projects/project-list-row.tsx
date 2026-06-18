"use client";

import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2, MessageCircle, Check, UserPlus } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
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
  onProjectUpdated: (project: ProjectWithMembers) => void;
  onProjectDeleted: (id: string) => void;
  index: number;
  isLast: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  highlighted?: boolean;
  onClearHighlight?: () => void;
  autoOpenComments?: boolean;
  onCommentsOpened?: () => void;
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function MemberPicker({
  project,
  users,
  onProjectUpdated,
}: {
  project: ProjectWithMembers;
  users: User[];
  onProjectUpdated: (project: ProjectWithMembers) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberIds, setMemberIds] = useState(project.members.map((m) => m.userId));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMemberIds(project.members.map((m) => m.userId));
  }, [project.members]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(id: string) {
    setMemberIds((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds }),
    });
    setSaving(false);
    setOpen(false);
    if (res.ok) onProjectUpdated(await res.json());
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 group/members focus:outline-none"
        title="Endre medlemmer"
      >
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
            <div className="h-6 w-6 rounded-full border border-dashed border-border flex items-center justify-center opacity-0 group-hover/members:opacity-100 transition-opacity">
              <UserPlus className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
        {project.members.length === 0 && (
          <span className="text-xs text-muted-foreground group-hover/members:hidden">—</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 bg-background border border-border rounded-lg shadow-lg w-48 py-1">
          <p className="text-xs text-muted-foreground px-3 py-1.5 border-b border-border mb-1">Medlemmer</p>
          {users.map((user) => {
            const checked = memberIds.includes(user.id);
            return (
              <button
                key={user.id}
                onClick={() => toggle(user.id)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
              >
                <div className={cn(
                  "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                  checked ? "bg-primary border-primary" : "border-border"
                )}>
                  {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{user.name}</span>
                </div>
              </button>
            );
          })}
          <div className="border-t border-border mt-1 px-3 py-2">
            <button
              onClick={save}
              disabled={saving}
              className="w-full text-xs font-medium bg-primary text-primary-foreground rounded-md py-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Lagrer…" : "Lagre"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectListRow({
  project,
  users,
  onProjectUpdated,
  onProjectDeleted,
  index,
  isLast,
  selected,
  onToggleSelect,
  highlighted,
  onClearHighlight,
  autoOpenComments,
  onCommentsOpened,
}: Props) {
  const { data: session } = useSession();
  const [editOpen, setEditOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  const hasAutoOpened = useRef(false);
  useEffect(() => {
    if (autoOpenComments && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const t = setTimeout(() => {
        setCommentOpen(true);
        onCommentsOpened?.();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [autoOpenComments]); // eslint-disable-line react-hooks/exhaustive-deps
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
    onProjectDeleted(project.id);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
  }

  function handleRowClick() {
    if (highlighted) onClearHighlight?.();
  }

  return (
    <>
      <Draggable draggableId={project.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            onClick={handleRowClick}
            className={cn(
              "grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center px-4 py-3 group bg-background transition-colors",
              !isLast && "border-b border-border",
              snapshot.isDragging ? "shadow-lg opacity-90 rounded-md" : "hover:bg-muted/30",
              selected && "bg-primary/5",
              highlighted && "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-inset ring-amber-300 dark:ring-amber-700/50"
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

            {/* Title + description + customer */}
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

            {/* Status */}
            <div className="w-28 flex justify-center" onClick={(e) => e.stopPropagation()}>
              <StatusPicker
                projectId={project.id}
                status={project.status}
                onChanged={onProjectUpdated}
              />
            </div>

            {/* Members — inline picker */}
            <div className="w-24 flex justify-center">
              <MemberPicker project={project} users={users} onProjectUpdated={onProjectUpdated} />
            </div>

            {/* Comments */}
            <button
              onClick={(e) => { e.stopPropagation(); setCommentOpen(true); }}
              className={cn(
                "w-40 flex items-center gap-2 px-2 text-left group/comment focus:outline-none rounded-md transition-colors",
                hasUnread && "bg-primary/8 px-2 py-1 -mx-0 ring-1 ring-primary/20"
              )}
            >
              <div className="relative flex-shrink-0">
                <MessageCircle className={cn(
                  "h-4 w-4 transition-colors",
                  hasUnread ? "text-primary" : commentCount > 0 ? "text-muted-foreground group-hover/comment:text-foreground" : "text-muted-foreground/30 group-hover/comment:text-muted-foreground"
                )} />
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary border-2 border-background animate-pulse" />
                )}
              </div>
              {lastComment ? (
                <span className={cn(
                  "text-xs truncate transition-colors",
                  hasUnread ? "text-primary font-semibold group-hover/comment:text-primary/80" : "text-muted-foreground group-hover/comment:text-foreground"
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
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Rediger"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
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
            onSuccess={(updated) => { setEditOpen(false); onProjectUpdated(updated); }}
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
