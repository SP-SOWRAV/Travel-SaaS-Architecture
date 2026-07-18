'use client';

// Status is always a colored badge, never plain text (UI_GUIDELINES §2/§12). Semantic
// mapping matches the Workflow Engine stages (MASTER.md §5): draft/invoiced are
// informational, reserved/ticket_issued are pending (warning), paid/completed are
// success, refunded/cancelled are danger.
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-sky-100 text-sky-700',
  reserved: 'bg-amber-100 text-amber-700',
  ticket_issued: 'bg-amber-100 text-amber-700',
  invoiced: 'bg-sky-100 text-sky-700',
  paid: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  refunded: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  reserved: 'Reserved',
  ticket_issued: 'Ticket Issued',
  invoiced: 'Invoiced',
  paid: 'Paid',
  completed: 'Completed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-600';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>
  );
}
