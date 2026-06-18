"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronDown, Check, Search, Trash2, X } from "lucide-react";
import { DragDropContext, Droppable, DropResult, DragStart } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectListRow } from "./project-list-row";
import { ProjectForm } from "./project-form";
import { WeeklyPanel, type WeeklyItem } from "./weekly-panel";
import type { ProjectWithMembers } from "@/services/projectService";
import { ProjectStatus } from "@prisma/client";
import { statusConfig } from "./project-status-badge";
import { cn } from "@/lib/utils";

type User = { id: string; name: string; email: string };

const statusFilters: { value: ProjectStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Alle" },
  { value: "ACTIVE", label: "Aktive" },
  { value: "PAUSED", label: "Pausede" },
  { value: "COMPLETED", label: "Fullførte" },
];

function filterPillClass(value: ProjectStatus | "ALL", active: boolean) {
  if (value === "ALL") {
    return active
      ? "bg-foreground text-background border-foreground"
      : "bg-background border-border text-muted-foreground hover:text-foreground";
  }
  return active ? statusConfig[value].activeButtonClass : statusConfig[value].buttonClass;
}

const bulkStatusOptions = Object.keys(statusConfig) as ProjectStatus[];

interface Props {
  projects: ProjectWithMembers[];
  users: User[];
  currentUserId: string;
  initialWeeklyItems: WeeklyItem[];
}

export function DashboardClient({ projects: initialProjects, users, currentUserId, initialWeeklyItems }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [highlightedId, setHighlightedId] = useState<string | null>(searchParams.get("project"));
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(
    searchParams.get("openComments") === "1" ? searchParams.get("project") : null
  );
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [showMine, setShowMine] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [memberFilters, setMemberFilters] = useState<string[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Weekly panel
  const [weeklyItems, setWeeklyItems] = useState<WeeklyItem[]>(initialWeeklyItems);
  const [isDragging, setIsDragging] = useState(false);

  async function addToWeekly(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    if (weeklyItems.some((w) => w.projectId === projectId)) return;
    const optimistic: WeeklyItem = {
      id: `temp-${projectId}`,
      projectId,
      project: { id: project.id, title: project.title, customer: project.customer ?? null, status: project.status },
    };
    setWeeklyItems((prev) => [...prev, optimistic]);
    const res = await fetch("/api/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) {
      const saved = await res.json();
      setWeeklyItems((prev) => prev.map((w) => (w.id === optimistic.id ? { ...optimistic, id: saved.id } : w)));
    } else {
      setWeeklyItems((prev) => prev.filter((w) => w.id !== optimistic.id));
    }
  }

  async function removeFromWeekly(projectId: string) {
    setWeeklyItems((prev) => prev.filter((w) => w.projectId !== projectId));
    await fetch(`/api/weekly/${projectId}`, { method: "DELETE" });
  }

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkMemberOpen, setBulkMemberOpen] = useState(false);
  const [bulkCustomerOpen, setBulkCustomerOpen] = useState(false);
  const [bulkCustomerValue, setBulkCustomerValue] = useState("");
  const [bulkMemberIds, setBulkMemberIds] = useState<string[]>([]);
  const bulkStatusRef = useRef<HTMLDivElement>(null);
  const bulkMemberRef = useRef<HTMLDivElement>(null);
  const bulkCustomerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setProjects(initialProjects); }, [initialProjects]);

  useEffect(() => {
    async function refreshProjects() {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    }
    window.addEventListener("new-notifications", refreshProjects);
    return () => window.removeEventListener("new-notifications", refreshProjects);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMemberDropdownOpen(false);
      }
      if (bulkStatusRef.current && !bulkStatusRef.current.contains(e.target as Node)) {
        setBulkStatusOpen(false);
      }
      if (bulkMemberRef.current && !bulkMemberRef.current.contains(e.target as Node)) {
        setBulkMemberOpen(false);
      }
      if (bulkCustomerRef.current && !bulkCustomerRef.current.contains(e.target as Node)) {
        setBulkCustomerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  function handleProjectUpdated(project: ProjectWithMembers) {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
  }

  function handleProjectDeleted(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function clearHighlight() {
    setHighlightedId(null);
    setOpenCommentsId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("project");
    params.delete("openComments");
    router.replace(`/dashboard${params.size > 0 ? `?${params}` : ""}`, { scroll: false });
  }

  // Scroll highlighted row into view and switch to "Alle" if needed
  useEffect(() => {
    if (!highlightedId) return;
    const inMine = initialProjects.find(
      (p) => p.id === highlightedId && p.members.some((m) => m.userId === currentUserId)
    );
    if (!inMine) setShowMine(false);
    setTimeout(() => {
      document.getElementById(`project-row-${highlightedId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [highlightedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMember(id: string) {
    setMemberFilters((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Slett ${selectedIds.size} prosjekt${selectedIds.size !== 1 ? "er" : ""}?`)) return;
    await Promise.all([...selectedIds].map((id) => fetch(`/api/projects/${id}`, { method: "DELETE" })));
    setSelectedIds(new Set());
    refresh();
  }

  async function handleBulkStatus(status: ProjectStatus) {
    setBulkStatusOpen(false);
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    ));
    setSelectedIds(new Set());
    refresh();
  }

  async function handleBulkMembers() {
    setBulkMemberOpen(false);
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: bulkMemberIds }),
      })
    ));
    setBulkMemberIds([]);
    setSelectedIds(new Set());
    refresh();
  }

  async function handleBulkCustomer() {
    setBulkCustomerOpen(false);
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: bulkCustomerValue }),
      })
    ));
    setBulkCustomerValue("");
    setSelectedIds(new Set());
    refresh();
  }

  function handleDragStart(_start: DragStart) {
    setIsDragging(true);
  }

  async function handleDragEnd(result: DropResult) {
    setIsDragging(false);
    if (!result.destination) return;

    // Dropped onto weekly panel
    if (result.destination.droppableId === "weekly-panel") {
      await addToWeekly(result.draggableId);
      return;
    }

    if (result.destination.index === result.source.index) return;

    const filteredIds = filtered.map((p) => p.id);
    const reorderedFiltered = [...filteredIds];
    const [moved] = reorderedFiltered.splice(result.source.index, 1);
    reorderedFiltered.splice(result.destination.index, 0, moved);

    const filteredSet = new Set(filteredIds);
    const nonFiltered = projects.filter((p) => !filteredSet.has(p.id));
    const reorderedAll = [
      ...reorderedFiltered.map((id) => projects.find((p) => p.id === id)!),
      ...nonFiltered,
    ];

    setProjects(reorderedAll);

    await fetch("/api/projects/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reorderedAll.map((p) => p.id) }),
    });
  }

  const searchLower = search.toLowerCase();
  const filtered = projects.filter((p) => {
    if (showMine && !p.members.some((m) => m.userId === currentUserId)) return false;
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (memberFilters.length > 0 && !memberFilters.every((uid) => p.members.some((m) => m.userId === uid))) return false;
    if (searchLower && !p.title.toLowerCase().includes(searchLower) && !(p.description ?? "").toLowerCase().includes(searchLower)) return false;
    return true;
  });

  const memberFilterLabel =
    memberFilters.length === 0
      ? "Alle medlemmer"
      : memberFilters.length === 1
      ? users.find((u) => u.id === memberFilters[0])?.name ?? "1 valgt"
      : `${memberFilters.length} valgte`;

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-5" style={{ isolation: "isolate" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prosjekter</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {projects.length} prosjekt{projects.length !== 1 ? "er" : ""} totalt
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:self-start">
          <Plus className="h-4 w-4 mr-2" />
          Nytt prosjekt
        </Button>
      </div>

      {/* Mine / Alle toggle */}
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
        <button
          onClick={() => setShowMine(true)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            showMine ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mine
        </button>
        <button
          onClick={() => setShowMine(false)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            !showMine ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Alle
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i tittel og beskrivelse…"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterPillClass(value, statusFilter === value)}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Member multi-select filter */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMemberDropdownOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 bg-background transition-colors",
                memberFilters.length > 0
                  ? "border-foreground text-foreground font-medium"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {memberFilterLabel}
              <ChevronDown className="h-3 w-3" />
            </button>

            {memberDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 bg-background border border-border rounded-lg shadow-md min-w-[180px] py-1">
                {memberFilters.length > 0 && (
                  <>
                    <button
                      onClick={() => setMemberFilters([])}
                      className="w-full text-left text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      Nullstill filter
                    </button>
                    <div className="h-px bg-border mx-2 my-1" />
                  </>
                )}
                {users.map((user) => {
                  const checked = memberFilters.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleMember(user.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                        checked ? "bg-primary border-primary" : "border-border"
                      )}>
                        {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <p className="text-sm font-medium leading-tight truncate">{user.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-muted/40 flex-wrap">
          <span className="text-sm font-medium mr-1">{selectedIds.size} valgt</span>

          {/* Bulk status */}
          <div className="relative" ref={bulkStatusRef}>
            <button
              onClick={() => { setBulkStatusOpen((v) => !v); setBulkMemberOpen(false); setBulkCustomerOpen(false); }}
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
            >
              Sett status
            </button>
            {bulkStatusOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-md py-1 min-w-[140px]">
                {bulkStatusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBulkStatus(s)}
                    className={`w-full text-left text-sm px-3 py-2 transition-colors font-medium ${statusConfig[s].buttonClass} hover:opacity-80`}
                  >
                    {statusConfig[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk members */}
          <div className="relative" ref={bulkMemberRef}>
            <button
              onClick={() => { setBulkMemberOpen((v) => !v); setBulkStatusOpen(false); setBulkCustomerOpen(false); }}
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
            >
              Endre medlemmer
            </button>
            {bulkMemberOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-md py-1 min-w-[200px]">
                <p className="text-xs text-muted-foreground px-3 py-1.5 border-b border-border">Erstatter eksisterende</p>
                {users.map((user) => {
                  const checked = bulkMemberIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => setBulkMemberIds((prev) => checked ? prev.filter((id) => id !== user.id) : [...prev, user.id])}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                        checked ? "bg-primary border-primary" : "border-border"
                      )}>
                        {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className="text-sm">{user.name}</span>
                    </button>
                  );
                })}
                <div className="border-t border-border mt-1 px-3 py-2">
                  <button
                    onClick={handleBulkMembers}
                    className="w-full text-xs font-medium bg-primary text-primary-foreground rounded-md py-1.5 hover:bg-primary/90 transition-colors"
                  >
                    Bruk på valgte
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk customer */}
          <div className="relative" ref={bulkCustomerRef}>
            <button
              onClick={() => { setBulkCustomerOpen((v) => !v); setBulkStatusOpen(false); setBulkMemberOpen(false); }}
              className="text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
            >
              Endre kunde
            </button>
            {bulkCustomerOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-md p-3 min-w-[220px]">
                <p className="text-xs text-muted-foreground mb-2">Sett kunde på valgte prosjekter</p>
                <input
                  type="text"
                  value={bulkCustomerValue}
                  onChange={(e) => setBulkCustomerValue(e.target.value)}
                  placeholder="Kundenavn…"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-2"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBulkCustomer(); } }}
                  autoFocus
                />
                <button
                  onClick={handleBulkCustomer}
                  className="w-full text-xs font-medium bg-primary text-primary-foreground rounded-md py-1.5 hover:bg-primary/90 transition-colors"
                >
                  Bruk på valgte
                </button>
              </div>
            )}
          </div>

          {/* Bulk delete */}
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive bg-background hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Slett
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            title="Avbryt utvalg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Project list + weekly panel */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 items-start">
          {/* Weekly panel — slides in when dragging */}
          <WeeklyPanel
            items={weeklyItems}
            visible={isDragging}
            isDragOver={false}
            onRemove={removeFromWeekly}
          />

          {/* Main list */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center h-52 gap-2">
                <p className="text-sm font-medium text-muted-foreground">Ingen prosjekter funnet</p>
                <p className="text-xs text-muted-foreground">Prøv å justere filteret, eller opprett et nytt prosjekt.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border">
                {/* List header */}
                <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center px-4 py-2 bg-muted/40 border-b border-border rounded-t-lg">
                  <div
                    onClick={toggleSelectAll}
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 mr-3",
                      allSelected ? "bg-primary border-primary" : someSelected ? "bg-primary/50 border-primary/50" : "border-border hover:border-foreground/50"
                    )}
                  >
                    {(allSelected || someSelected) && (
                      <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                        {allSelected
                          ? <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          : <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        }
                      </svg>
                    )}
                  </div>
                  <div className="w-7 mr-3" />
                  <span className="text-xs font-medium text-muted-foreground">Prosjekt</span>
                  <span className="text-xs font-medium text-muted-foreground w-28 text-center">Status</span>
                  <span className="text-xs font-medium text-muted-foreground w-24 text-center">Medlemmer</span>
                  <span className="text-xs font-medium text-muted-foreground w-40 pl-2">Kommentarer</span>
                  <div className="w-16" />
                </div>
                <Droppable droppableId="projects">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {filtered.map((project, i) => (
                        <div key={project.id} id={`project-row-${project.id}`}>
                          <ProjectListRow
                            project={project}
                            users={users}
                            onProjectUpdated={handleProjectUpdated}
                            onProjectDeleted={handleProjectDeleted}
                            index={i}
                            isLast={i === filtered.length - 1}
                            selected={selectedIds.has(project.id)}
                            onToggleSelect={() => toggleSelect(project.id)}
                            highlighted={highlightedId === project.id}
                            onClearHighlight={clearHighlight}
                            autoOpenComments={openCommentsId === project.id}
                            onCommentsOpened={() => setOpenCommentsId(null)}
                          />
                        </div>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nytt prosjekt</DialogTitle>
          </DialogHeader>
          <ProjectForm
            users={users}
            onSuccess={(project) => { setCreateOpen(false); setProjects((prev) => [...prev, project]); }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
