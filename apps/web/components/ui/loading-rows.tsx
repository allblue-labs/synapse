export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink/10">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid gap-4 px-5 py-5 md:grid-cols-[1fr_180px_130px] md:items-center">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-md bg-mist" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-44 rounded bg-mist" />
              <div className="mt-3 h-3 w-64 max-w-full rounded bg-mist" />
            </div>
          </div>
          <div className="h-6 w-24 rounded bg-mist" />
          <div className="h-4 w-20 rounded bg-mist" />
        </div>
      ))}
    </div>
  );
}
