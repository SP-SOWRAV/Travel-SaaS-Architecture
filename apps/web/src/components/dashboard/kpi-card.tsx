'use client';

// A KPI card variant of the standard card (UI_GUIDELINES §14): large numeric value,
// a label beneath — never more content than that, to stay scannable.
interface KpiCardProps {
  label: string;
  value: string;
  suffix?: string;
}

export function KpiCard({ label, value, suffix }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-2xl font-semibold text-neutral-900">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-neutral-500">{suffix}</span>}
      </div>
      <div className="mt-1 text-sm text-neutral-500">{label}</div>
    </div>
  );
}
