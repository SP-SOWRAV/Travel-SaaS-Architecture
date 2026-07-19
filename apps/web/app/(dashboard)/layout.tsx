'use client';

import { useState } from 'react';
import { useAuth } from '../../src/lib/auth-context';
import { Sidebar } from '../../src/components/layout/sidebar';
import { TopBar } from '../../src/components/layout/top-bar';

// The persistent Sidebar + Header shell (UI_GUIDELINES §7-9) every page under this route
// group was missing entirely (Production Audit, Critical finding: "no way to move to
// another module short of a browser back button, a table-embedded link, or manually
// editing the URL"). A layout.tsx wraps every existing page automatically — no
// individual page needed to change.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isInitializing || !isAuthenticated || !user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileMenu={() => setMobileOpen(true)} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
