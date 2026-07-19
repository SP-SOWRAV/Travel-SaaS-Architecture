'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

// Per-page Header's cross-page pieces (UI_GUIDELINES §9): the user menu (name/role +
// Logout) that previously existed on exactly one page in the whole app, plus the mobile
// menu toggle for the Sidebar's off-canvas drawer (§20). Page-specific title and primary
// action stay owned by each page.tsx, as they already are.
export function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
        className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <span className="md:hidden" />

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-neutral-700 sm:inline">
          {user?.role}
        </span>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
