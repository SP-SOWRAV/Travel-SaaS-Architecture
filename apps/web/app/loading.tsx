// UI_GUIDELINES §17: full-page loading reserved for the very first load, before any
// chrome can render — this is the global fallback while a route segment loads.
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"
        role="status"
        aria-label="Loading"
      />
    </main>
  );
}
