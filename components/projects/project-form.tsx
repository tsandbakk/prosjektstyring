"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProjectStatus } from "@prisma/client";
import type { ProjectWithMembers } from "@/services/projectService";
import { statusConfig } from "./project-status-badge";
import { cn } from "@/lib/utils";

type User = { id: string; name: string; email: string };

interface Props {
  project?: ProjectWithMembers;
  users: User[];
  onSuccess: () => void;
  onCancel: () => void;
}

const statusOptions = (Object.keys(statusConfig) as ProjectStatus[]);

export function ProjectForm({ project, users, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    project?.members.map((m) => m.userId) ?? []
  );
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "ACTIVE");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleUser(id: string) {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      customer: fd.get("customer") as string,
      status,
      memberIds: selectedUsers,
    };

    const url = project ? `/api/projects/${project.id}` : "/api/projects";
    const method = project ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Noe gikk galt.");
    } else {
      onSuccess();
    }
  }

  const memberLabel =
    selectedUsers.length === 0
      ? "Ingen valgt"
      : selectedUsers.length === 1
      ? users.find((u) => u.id === selectedUsers[0])?.name ?? "1 valgt"
      : `${selectedUsers.length} valgte`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Left column */}
        <div className="space-y-4 pr-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Tittel</Label>
            <Input id="title" name="title" defaultValue={project?.title} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer">Kunde</Label>
            <Input id="customer" name="customer" defaultValue={project?.customer ?? ""} placeholder="Kundenavn (valgfritt)" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Beskrivelse</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={project?.description ?? ""}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Valgfri beskrivelse..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    status === s ? statusConfig[s].activeButtonClass : statusConfig[s].buttonClass
                  }`}
                >
                  {statusConfig[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — members */}
        <div className="space-y-1.5 pl-6 bg-muted/30 rounded-r-md py-4 pr-4">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Teammedlemmer</Label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMemberDropdownOpen((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm bg-background transition-colors",
                memberDropdownOpen ? "border-ring ring-2 ring-ring" : "border-input hover:border-foreground/30"
              )}
            >
              <span className={selectedUsers.length === 0 ? "text-muted-foreground" : ""}>{memberLabel}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>

            {memberDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-md py-1 max-h-56 overflow-y-auto">
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">Ingen brukere registrert ennå.</p>
                )}
                {users.map((user) => {
                  const checked = selectedUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                        checked ? "bg-primary border-primary" : "border-border"
                      )}>
                        {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="text-sm font-medium">{user.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected members list */}
          {selectedUsers.length > 0 && (
            <div className="mt-2 space-y-1">
              {selectedUsers.map((uid) => {
                const u = users.find((u) => u.id === uid);
                if (!u) return null;
                return (
                  <div key={uid} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
                    <span className="text-sm">{u.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleUser(uid)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Fjern
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {project ? "Lagre endringer" : "Opprett prosjekt"}
        </Button>
      </div>
    </form>
  );
}
