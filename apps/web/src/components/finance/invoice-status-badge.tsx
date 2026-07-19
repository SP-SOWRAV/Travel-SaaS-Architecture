'use client';

// Document-level Invoice status (DATABASE.md §8) is a distinct enum from booking lifecycle
// — its own badge, not a reuse of bookings/status-badge.tsx (UI_GUIDELINES §2/§12: status is
// always a colored badge, never plain text).
const STYLES: Record<string, string> = {
  issued: 'bg-sky-100 text-sky-700',
  partially_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-700',
};

const LABELS: Record<string, string> = {
  issued: 'Issued',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  void: 'Void',
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-neutral-100 text-neutral-600';
  const label = LABELS[status] ?? status;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}
