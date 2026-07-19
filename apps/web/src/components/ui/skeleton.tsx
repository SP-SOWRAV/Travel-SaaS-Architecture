// Shared loading-state primitive (UI_GUIDELINES §17 audit hardening) — replaces every
// bare "Loading…" text node and the misleading flash of an empty-state row while a list's
// first fetch is still in flight, with a pulsing placeholder that mirrors the shape of the
// content about to render.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-neutral-200 ${className}`} />;
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-neutral-100">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <td key={colIndex} className="py-3 pr-4">
              <Skeleton className="h-4 w-full max-w-[10rem]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}
