"use client";

import { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, Search, Trash2 } from "lucide-react";
import { StatusPicker } from "@/components/projects/status-picker";
import { CommentThread } from "@/components/projects/comment-thread";
import { cn } from "@/lib/utils";
import type { WeeklyProjectWithDetails } from "@/services/weeklyProjectService";
import type { RecentComment, CommentWithAuthor } from "@/services/commentService";
import { ProjectStatus } from "@prisma/client";

const statusCardClass: Record<ProjectStatus, string> = {
  ACTIVE:    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40",
  PAUSED:    "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40",
  COMPLETED: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800/40",
};

function timeAgo(date: Date | string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Akkurat nå";
  if (mins < 60) return `${mins}m siden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}t siden`;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

interface Props {
  weeklyItems: WeeklyProjectWithDetails[];
  recentComments: RecentComment[];
  currentUserId: string;
  projects: { id: string; title: string }[];
}

export function HomeClient({ weeklyItems: initial, recentComments, currentUserId, projects }: Props) {
  const [items, setItems] = useState(initial);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  // null = not yet loaded from localStorage (suppresses unread flash on mount)
  const [viewedMap, setViewedMap] = useState<Record<string, number> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map: Record<string, number> = {};
    const prefix = `comments_viewed_${currentUserId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const val = localStorage.getItem(key);
        if (val) map[key.slice(prefix.length)] = parseInt(val, 10);
      }
    }
    setViewedMap(map);
  }, [currentUserId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setSearch("");
      }
    }
    if (showPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPicker]);

  function isUnread(c: RecentComment) {
    if (viewedMap === null) return false;
    const viewed = viewedMap[c.project.id];
    return !viewed || new Date(c.createdAt).getTime() > viewed;
  }

  function openThread(projectId: string) {
    const now = Date.now();
    localStorage.setItem(`comments_viewed_${currentUserId}_${projectId}`, String(now));
    setViewedMap((prev) => ({ ...(prev ?? {}), [projectId]: now }));
    setOpenProjectId(projectId);
  }

  const weeklyProjectIds = new Set(items.map((i) => i.projectId));
  const filteredProjects = projects
    .filter((p) => !weeklyProjectIds.has(p.id))
    .filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    if (result.destination.droppableId === "weekly-remove") {
      const item = items.find((i) => i.id === result.draggableId);
      if (item) await handleRemove(item.projectId);
      return;
    }

    if (result.destination.index === result.source.index) return;
    const reordered = [...items];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);
    await fetch("/api/weekly/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
    });
  }

  async function handleRemove(projectId: string) {
    setItems((prev) => prev.filter((i) => i.projectId !== projectId));
    await fetch(`/api/weekly/${projectId}`, { method: "DELETE" });
  }

  function handleStatusChange(projectId: string, status: ProjectStatus) {
    setItems((prev) =>
      prev.map((i) => (i.projectId === projectId ? { ...i, project: { ...i.project, status } } : i))
    );
  }

  async function handleAddProject(projectId: string) {
    const res = await fetch("/api/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      const added = await res.json();
      setItems((prev) => [...prev, added]);
      setSearch("");
      setShowPicker(false);
    }
  }

  const openProject = openProjectId
    ? recentComments.find((c) => c.project.id === openProjectId)?.project ?? null
    : null;

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 max-w-5xl">
      {/* Denne uken */}
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Denne uken</h2>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {items.length} prosjekt{items.length !== 1 ? "er" : ""}
            </span>
          )}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="rounded-xl border border-border bg-card shadow-sm">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 gap-1.5">
                <p className="text-sm text-muted-foreground">Ingen prosjekter denne uken</p>
                <p className="text-xs text-muted-foreground">Dra prosjekter hit fra prosjektlisten</p>
              </div>
            ) : (
              <Droppable droppableId="home-weekly">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-col gap-2 p-3"
                  >
                    {items.map((item, i) => (
                      <Draggable key={item.id} draggableId={item.id} index={i}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                              statusCardClass[item.project.status],
                              snapshot.isDragging && "shadow-md opacity-90"
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors flex-shrink-0"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.project.title}</p>
                              {item.project.customer && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {item.project.customer}
                                </p>
                              )}
                            </div>

                            <div onClick={(e) => e.stopPropagation()}>
                              <StatusPicker
                                projectId={item.projectId}
                                status={item.project.status}
                                onChanged={(s) => handleStatusChange(item.projectId, s)}
                              />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

            {/* Add project button */}
            <div
              ref={pickerRef}
              className={cn("relative px-4 py-3", items.length > 0 && "border-t border-border")}
            >
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Legg til prosjekt
              </button>

              {showPicker && (
                <div className="absolute bottom-full left-4 mb-2 w-72 rounded-lg border border-border bg-popover shadow-lg z-50">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                    <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Søk prosjekter..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto py-1">
                    {filteredProjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Ingen prosjekter å legge til
                      </p>
                    ) : (
                      filteredProjects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleAddProject(p.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors truncate"
                        >
                          {p.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trash drop zone — always rendered, subtle at rest, activates on drag-over */}
          <Droppable droppableId="weekly-remove">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "mt-2 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 py-2.5 text-xs transition-colors",
                  snapshot.isDraggingOver
                    ? "border-destructive/60 bg-destructive/10 text-destructive"
                    : "border-border/40 text-muted-foreground/40"
                )}
              >
                <Trash2 className="h-3 w-3" />
                Fjern fra ukesliste
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Siste aktivitet */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Siste aktivitet</h2>

        {recentComments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Ingen kommentarer ennå</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {recentComments.map((c) => {
              const unread = isUnread(c);
              return (
                <button
                  key={c.id}
                  onClick={() => openThread(c.project.id)}
                  className={cn(
                    "w-full text-left flex gap-2.5 px-3 py-2.5 transition-colors",
                    unread
                      ? "bg-primary/[0.04] hover:bg-primary/[0.07] dark:bg-primary/[0.06] dark:hover:bg-primary/[0.10]"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-medium">
                      {c.author.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    {unread && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn("text-xs leading-none", unread ? "font-semibold" : "font-medium")}>
                        {c.author.id === currentUserId ? "Deg" : c.author.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground truncate">{c.project.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <div className={cn(
                      "rounded-2xl rounded-tl-sm px-3 py-2",
                      unread ? "bg-primary/10 dark:bg-primary/15" : "bg-muted"
                    )}>
                      <p className={cn("text-sm leading-snug line-clamp-2", unread && "font-medium")}>
                        {c.content}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openProjectId && openProject && (
        <CommentThread
          projectId={openProjectId}
          projectTitle={openProject.title}
          open={!!openProjectId}
          onOpenChange={(open) => {
            if (!open) setOpenProjectId(null);
          }}
          onCommentAdded={(_comment: CommentWithAuthor) => {}}
        />
      )}
    </div>
  );
}
