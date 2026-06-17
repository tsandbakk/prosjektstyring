"use client";

import { useState } from "react";
import { ProjectStatus } from "@prisma/client";
import { ProjectStatusBadge } from "./project-status-badge";

const statuses: ProjectStatus[] = ["ACTIVE", "PAUSED", "COMPLETED"];

const labels: Record<ProjectStatus, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pauset",
  COMPLETED: "Fullført",
};

interface Props {
  projectId: string;
  status: ProjectStatus;
  onChanged: (status: ProjectStatus) => void;
}

export function StatusPicker({ projectId, status, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);

  async function handleSelect(s: ProjectStatus) {
    setOpen(false);
    if (s === current) return;
    setCurrent(s);
    onChanged(s);
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="focus:outline-none"
      >
        <ProjectStatusBadge status={current} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-md py-1 min-w-[130px]">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); handleSelect(s); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
              >
                <ProjectStatusBadge status={s} />
                {s === current && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
