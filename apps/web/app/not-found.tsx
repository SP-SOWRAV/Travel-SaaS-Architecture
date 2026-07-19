import Link from 'next/link';

// UI_GUIDELINES §19: "a resource that doesn't exist or belongs to another Agency shows
// the same 'Not found' page state — the UI never implies 'this exists but isn't yours'."
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <p className="text-sm font-medium text-neutral-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-600">
        The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/home"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
