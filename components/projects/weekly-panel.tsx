"use client";

import { X, CalendarDays } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge } from "./project-status-badge";
import type { ProjectStatus } from "@prisma/client";

export type WeeklyItem = {
  id: string;
  projectId: string;
  project: { id: string; title: string; customer: string | null; status: ProjectStatus };
};

interface Props {
  items: WeeklyItem[];
  visible: boolean;
  isDragOver: boolean;
  onRemove: (projectId: string) => void;
}

export function WeeklyPanel({ items, visible, isDragOver, onRemove }: Props) {
  return (
    <div
      className={cn(
        "transition-all duration-200 overflow-hidden flex-shrink-0",
        visible ? "w-56 opacity-100" : "w-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="w-56 h-full">
        <Droppable droppableId="weekly-panel">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "rounded-lg border-2 border-dashed transition-colors min-h-[200px] flex flex-col",
                snapshot.isDraggingOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20"
              )}
            >
              {/* Header */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2.5 border-b border-dashed transition-colors",
                snapshot.isDraggingOver ? "border-primary/30" : "border-border"
              )}>
                <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium">Denne uken</span>
                {items.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                )}
              </div>

              {/* Drop hint */}
              {items.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex-1 flex items-center justify-center p-4">
                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Dra prosjekter hit for ukeslisten
                  </p>
                </div>
              )}
              {snapshot.isDraggingOver && items.length === 0 && (
                <div className="flex-1 flex items-center justify-center p-4">
                  <p className="text-xs text-primary font-medium text-center">Slipp her</p>
                </div>
              )}

              {/* Weekly items */}
              <div className="flex flex-col">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 px-3 py-2 border-b border-border/50 last:border-0 group/item"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{item.project.title}</p>
                      {item.project.customer && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.project.customer}</p>
                      )}
                      <div className="mt-1">
                        <ProjectStatusBadge status={item.project.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.projectId)}
                      className="flex-shrink-0 mt-0.5 h-5 w-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors opacity-0 group-hover/item:opacity-100"
                      title="Fjern fra ukesliste"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}
