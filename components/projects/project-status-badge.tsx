import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@prisma/client";

export const statusConfig: Record<ProjectStatus, { label: string; badgeClass: string; buttonClass: string; activeButtonClass: string }> = {
  ACTIVE:    { label: "Aktiv",    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", buttonClass: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",  activeButtonClass: "bg-emerald-600 text-white border-emerald-600" },
  PAUSED:    { label: "Pauset",   badgeClass: "bg-amber-50 text-amber-700 border-amber-200",       buttonClass: "border-amber-200 text-amber-700 hover:bg-amber-50",        activeButtonClass: "bg-amber-500 text-white border-amber-500" },
  COMPLETED: { label: "Fullført", badgeClass: "bg-sky-50 text-sky-700 border-sky-200",             buttonClass: "border-sky-200 text-sky-700 hover:bg-sky-50",              activeButtonClass: "bg-sky-600 text-white border-sky-600" },
};

const config: Record<ProjectStatus, { label: string; className: string }> = {
  ACTIVE:    { label: statusConfig.ACTIVE.label,    className: statusConfig.ACTIVE.badgeClass },
  PAUSED:    { label: statusConfig.PAUSED.label,    className: statusConfig.PAUSED.badgeClass },
  COMPLETED: { label: statusConfig.COMPLETED.label, className: statusConfig.COMPLETED.badgeClass },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = config[status];
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
