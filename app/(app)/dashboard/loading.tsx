export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-muted rounded-md" />
          <div className="h-4 w-24 bg-muted rounded-md" />
        </div>
        <div className="h-9 w-36 bg-muted rounded-md" />
      </div>
      <div className="h-8 w-40 bg-muted rounded-lg" />
      <div className="h-10 w-full bg-muted rounded-md" />
      <div className="h-8 w-72 bg-muted rounded-md" />
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="h-10 bg-muted/60 border-b border-border" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
            <div className="h-6 w-24 bg-muted rounded-full" />
            <div className="flex -space-x-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-6 w-6 bg-muted rounded-full border-2 border-background" />
              ))}
            </div>
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
