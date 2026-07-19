'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_ITEMS } from '../../lib/nav-items';

const COLLAPSE_STORAGE_KEY = 'ota_sidebar_collapsed';

interface SidebarProps {
  role: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

// Persistent Sidebar (UI_GUIDELINES §7/§8) — the module-to-module navigation the app was
// entirely missing (Production Audit, Critical finding). Fixed-width, collapsible with
// state persisted per user (localStorage is sufficient for MVP per §8), items shown/
// hidden per role rather than disabled, active route visually distinct.
export function Sidebar({ role, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  const content = (
    <nav className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
        {!collapsed && <span className="text-sm font-semibold text-neutral-900">OTA SaaS</span>}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 md:inline-flex"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d={collapsed ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close menu"
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onCloseMobile}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {collapsed ? item.label.slice(0, 2) : item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop: fixed-width persistent column (§8: 240px expanded, 64px collapsed). */}
      <aside
        className={`hidden shrink-0 border-r border-neutral-200 md:block ${collapsed ? 'w-16' : 'w-60'}`}
      >
        {content}
      </aside>

      {/* Mobile: off-canvas drawer (§20: collapses to off-canvas below md). */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-neutral-200 shadow-lg">{content}</aside>
        </div>
      )}
    </>
  );
}
