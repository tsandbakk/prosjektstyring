export default function HomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-7 w-16 bg-muted rounded-md" />
        <div className="h-4 w-40 bg-muted rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="h-5 w-24 bg-muted rounded-md" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg border border-border" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 w-28 bg-muted rounded-md" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg border border-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
