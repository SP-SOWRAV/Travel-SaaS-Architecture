// Sidebar module order (UI_GUIDELINES §8): Dashboard, then Flight Booking, then Finance,
// then the Customer/Reference/Agency-Core group, then Reports, then Settings/Activity
// Log/My Profile at the bottom. `roles` restricts visibility to match what the API
// already enforces server-side (Settings: agency_admin only; Reports: agency_admin/
// branch_manager only) — omitted means visible to every authenticated role.
export interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/home' },
  { label: 'Bookings', href: '/bookings' },
  { label: 'Finance', href: '/finance' },
  { label: 'Customers', href: '/customers' },
  { label: 'Reference Data', href: '/reference-data' },
  { label: 'Branches', href: '/branches' },
  { label: 'Users', href: '/users' },
  { label: 'Reports', href: '/reports', roles: ['agency_admin', 'branch_manager'] },
  { label: 'Settings', href: '/settings', roles: ['agency_admin'] },
  { label: 'Activity Log', href: '/activity-log' },
  { label: 'My Profile', href: '/profile' },
];
