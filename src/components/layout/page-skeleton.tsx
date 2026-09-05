export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6" aria-label="Carregando conteúdo">
      <div className="space-y-3">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="h-9 w-72 max-w-full rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-2xl border border-slate-100 bg-white"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-slate-100 p-5 last:border-0"
          >
            <div className="h-11 w-11 rounded-xl bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-50" />
            </div>
            <div className="h-8 w-24 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
