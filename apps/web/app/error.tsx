'use client';

// UI_GUIDELINES §19: "a generic, branded error page with a 'reload'/'go to dashboard'
// action — never a raw stack trace or technical detail surfaced to the user" (matches
// API_RULES §21's same rule on the backend). `error`/`digest` are deliberately never
// rendered here.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
          <p className="text-sm font-medium text-red-600">Something went wrong</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Unexpected error</h1>
          <p className="mt-2 max-w-sm text-sm text-neutral-600">
            An unexpected error occurred. Try reloading the page, or return to the dashboard.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Try again
            </button>
            <a
              href="/home"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
